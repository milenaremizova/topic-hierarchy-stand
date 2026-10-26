import {
  describeEvent,
  formatDuration,
  pathText,
  type AccountListItem,
  type GenerateAccountsResponse,
  type GeneratedAccount,
  type LogRow,
  type LogsResponse,
  type ResetAccountResponse,
  type TestGroup,
  type TrajectoryResponse,
} from '@stand/shared'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireRole, toPublicAccount } from '../auth/session.js'
import { pathTo } from '../data/load.js'
import { db } from '../db/client.js'
import {
  accounts,
  chatRuns,
  hierarchyEvents,
  type AccountRow,
  type ChatRunRow,
  type HierarchyEventRow,
} from '../db/schema.js'
import { sendCsv, toCsv } from '../lib/csv.js'
import { HttpError, notFound } from '../lib/errors.js'
import { uniqueFios } from '../lib/fio.js'
import { generatePassword, hashPassword } from '../lib/password.js'

const GenerateBody = z.object({
  manual: z.number().int().min(0).max(50),
  search: z.number().int().min(0).max(50),
})

const AccountParams = z.object({ id: z.uuid() })
const RunParams = z.object({ runId: z.uuid() })

// параметры адреса (?group=manual&archived=true) всегда приходят строками
const LogsQuery = z.object({
  group: z.enum(['manual', 'search']).optional(),
  accountId: z.uuid().optional(),
  scenarioId: z.string().optional(),
  archived: z.enum(['true', 'false']).optional(),
})

/** Следующие свободные логины вида op01, op02, … */
async function nextLogins(count: number): Promise<string[]> {
  const taken = await db.select({ login: accounts.login }).from(accounts)
  const max = taken.reduce((m, { login }) => {
    const n = /^op(\d+)$/.exec(login)?.[1]
    return n ? Math.max(m, Number(n)) : m
  }, 0)
  return Array.from({ length: count }, (_, i) => `op${String(max + i + 1).padStart(2, '0')}`)
}

export async function managerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireRole('manager'))

  /** Строка БД (прохождение + учётка) → строка таблицы результатов. Нужна и в logs, и в траектории */
  const toLogRow = (run: ChatRunRow, account: AccountRow): LogRow => {
    const scenario = app.standData.scenarioById.get(run.scenarioId)
    const expectedId = scenario?.expectedLeafId
    // У завершённого диалога оба времени точно есть — отсюда «!»
    const openedAt = run.openedAt!.getTime()
    const closedAt = run.closedAt!.getTime()
    return {
      runId: run.id,
      account: toPublicAccount(account),
      scenario: { id: run.scenarioId, title: scenario?.title ?? run.scenarioId },
      position: run.position,
      archived: run.archived,
      closedAt,
      durationMs: closedAt - openedAt,
      finalPath: run.finalPath ?? [],
      expectedPath: expectedId ? pathTo(app.standData, expectedId) : [],
      isMatch: run.finalLeafId === expectedId,
    }
  }

  /** Массовая генерация учёток. Пароли возвращаются один раз — в БД только хеши */
  app.post('/accounts/generate', async (req): Promise<GenerateAccountsResponse> => {
    const body = GenerateBody.parse(req.body)
    const groups: TestGroup[] = [
      ...Array<TestGroup>(body.manual).fill('manual'),
      ...Array<TestGroup>(body.search).fill('search'),
    ]
    if (groups.length === 0) return { accounts: [] }

    const logins = await nextLogins(groups.length)
    const takenNames = await db.select({ n: accounts.displayName }).from(accounts)
    const names = uniqueFios(
      groups.length,
      takenNames.map((r) => r.n),
    )

    const prepared = await Promise.all(
      groups.map(async (group, i) => {
        const password = generatePassword()
        return {
          row: {
            id: randomUUID(),
            login: logins[i]!,
            passwordHash: await hashPassword(password),
            role: 'operator' as const,
            displayName: names[i]!,
            group,
          },
          password,
        }
      }),
    )

    // Один INSERT с несколькими строками атомарен сам по себе:
    // либо вставятся все учётки, либо ни одной
    await db.insert(accounts).values(prepared.map((p) => p.row))

    const created: GeneratedAccount[] = prepared.map((p) => ({
      ...toPublicAccount(p.row),
      password: p.password,
    }))
    return { accounts: created }
  })

  app.get('/accounts', async (): Promise<{ accounts: AccountListItem[] }> => {
    // SELECT accounts.*, count(chat_runs.id) FILTER (WHERE status = 'closed')
    // FROM accounts
    // LEFT JOIN chat_runs ON chat_runs.account_id = accounts.id AND NOT chat_runs.archived
    // GROUP BY accounts.id ORDER BY login
    const rows = await db
      .select({
        account: accounts,
        completedRuns:
          sql<number>`count(${chatRuns.id}) filter (where ${chatRuns.status} = 'closed')`.mapWith(
            Number,
          ),
      })
      .from(accounts)
      .leftJoin(chatRuns, and(eq(chatRuns.accountId, accounts.id), eq(chatRuns.archived, false)))
      .groupBy(accounts.id)
      .orderBy(asc(accounts.login))

    return {
      accounts: rows.map((r) => ({
        ...toPublicAccount(r.account),
        createdAt: r.account.createdAt.getTime(),
        completedRuns: r.completedRuns,
      })),
    }
  })

  /**
   * POST /api/manager/accounts/:id/reset — полный сброс прохождения.
   * Ничего не удаляем: текущие прохождения помечаем archived, события остаются.
   * При следующем входе оператора /runs/current создаст новую перемешанную цепочку.
   */
  app.post('/accounts/:id/reset', async (req): Promise<ResetAccountResponse> => {
    const { id } = AccountParams.parse(req.params)

    const [account] = await db
      .select({ role: accounts.role })
      .from(accounts)
      .where(eq(accounts.id, id))
    if (!account) throw notFound('Оператор')
    if (account.role !== 'operator') {
      throw new HttpError(400, 'not_operator', 'Сбросить можно только оператора')
    }

    const archived = await db
      .update(chatRuns)
      .set({ archived: true })
      .where(and(eq(chatRuns.accountId, id), eq(chatRuns.archived, false)))
      .returning({ id: chatRuns.id })

    return { archived: archived.length }
  })

  /** GET /api/manager/logs/:runId — траектория одного прохождения: все события по порядку */
  app.get('/logs/:runId', async (req): Promise<TrajectoryResponse> => {
    const { runId } = RunParams.parse(req.params)

    // Архивные тоже можно смотреть — поэтому без условия на archived
    const [found] = await db
      .select({ run: chatRuns, account: accounts })
      .from(chatRuns)
      .innerJoin(accounts, eq(accounts.id, chatRuns.accountId))
      .where(and(eq(chatRuns.id, runId), eq(chatRuns.status, 'closed')))
    if (!found) throw notFound('Диалог')

    const events = await db
      .select()
      .from(hierarchyEvents)
      .where(eq(hierarchyEvents.runId, runId))
      .orderBy(asc(hierarchyEvents.ts))

    const startedAt = found.run.openedAt!.getTime()

    return {
      row: toLogRow(found.run, found.account),
      events: events.map((e) => ({
        sinceStartMs: e.ts.getTime() - startedAt,
        type: e.type,
        nodeId: e.nodeId,
        query: e.query,
        resultsCount: e.resultsCount,
        resultIndex: e.resultIndex,
        path: e.path,
      })),
    }
  })

  /** Строки таблицы результатов с фильтрами — общая часть для /logs и /logs.csv */
  const loadLogRows = async (q: z.infer<typeof LogsQuery>): Promise<LogRow[]> => {
    // Условия собираем списком: каждое добавляется, только если фильтр задан
    const conditions = [eq(chatRuns.status, 'closed')]
    if (q.archived !== 'true') conditions.push(eq(chatRuns.archived, false))
    if (q.group) conditions.push(eq(accounts.group, q.group))
    if (q.accountId) conditions.push(eq(chatRuns.accountId, q.accountId))
    if (q.scenarioId) conditions.push(eq(chatRuns.scenarioId, q.scenarioId))

    const rows = await db
      .select({ run: chatRuns, account: accounts })
      .from(chatRuns)
      .innerJoin(accounts, eq(accounts.id, chatRuns.accountId))
      .where(and(...conditions))
      .orderBy(asc(accounts.login), asc(chatRuns.position))

    return rows.map(({ run, account }) => toLogRow(run, account))
  }

  /** События нескольких прохождений одним запросом, сгруппированные по прохождению */
  const loadEventsByRun = async (runIds: string[]) => {
    const byRun = new Map<string, HierarchyEventRow[]>()
    if (runIds.length === 0) return byRun // пустой IN () — ошибка в SQL, поэтому сразу выходим

    const events = await db
      .select()
      .from(hierarchyEvents)
      .where(inArray(hierarchyEvents.runId, runIds))
      .orderBy(asc(hierarchyEvents.ts))

    for (const e of events) {
      const list = byRun.get(e.runId) ?? [] // уже накопленные события этого прохождения или новый пустой список
      list.push(e)
      byRun.set(e.runId, list)
    }
    return byRun
  }

  const groupLabel = (r: LogRow) => (r.account.group === 'search' ? 'Поиск' : 'Ручной')
  const today = () => new Date().toISOString().slice(0, 10)

  /** GET /api/manager/logs — таблица результатов: одна строка на завершённый диалог */
  app.get('/logs', async (req): Promise<LogsResponse> => {
    const q = LogsQuery.parse(req.query)
    return { rows: await loadLogRows(q) }
  })

  app.get('/logs.csv', async (req, reply) => {
    const q = LogsQuery.parse(req.query)
    const rows = await loadLogRows(q)
    const eventsByRun = await loadEventsByRun(rows.map((r) => r.runId))

    const csv = toCsv(
      [
        'Логин',
        'ФИО на стенде',
        'Группа',
        '№ диалога',
        'Диалог',
        'Выбрал',
        'Эталон',
        'Совпало',
        'Время, с',
        'Завершён',
        'Архив',
        'Траектория',
      ],
      rows.map((r) => {
        const startedAt = r.closedAt - r.durationMs // время открытия диалога
        const trajectory = (eventsByRun.get(r.runId) ?? [])
          .map((e) => `${formatDuration(e.ts.getTime() - startedAt)} ${describeEvent(e)}`)
          .join('\n') // каждое событие — с новой строки внутри ячейки
        return [
          r.account.login,
          r.account.displayName,
          groupLabel(r),
          r.position + 1,
          r.scenario.title,
          pathText(r.finalPath),
          pathText(r.expectedPath),
          r.isMatch ? 'Да' : 'Нет',
          Math.round(r.durationMs / 1000),
          new Date(r.closedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
          r.archived ? 'Да' : '',
          trajectory,
        ]
      }),
    )
    return sendCsv(reply, `results-${today()}.csv`, csv)
  })

  /** GET /api/manager/events.csv — одна строка на одно действие оператора, для подсчётов в Excel */
  app.get('/events.csv', async (req, reply) => {
    const q = LogsQuery.parse(req.query)
    const rows = await loadLogRows(q)
    const eventsByRun = await loadEventsByRun(rows.map((r) => r.runId))

    const lines: (string | number)[][] = []
    for (const r of rows) {
      const startedAt = r.closedAt - r.durationMs
      for (const e of eventsByRun.get(r.runId) ?? []) {
        lines.push([
          r.account.login,
          groupLabel(r),
          r.position + 1,
          r.scenario.title,
          r.isMatch ? 'Да' : 'Нет',
          Math.round((e.ts.getTime() - startedAt) / 1000), // секунды от начала диалога
          e.type,
          describeEvent(e),
          e.query ?? '',
          e.resultsCount ?? '',
          e.resultIndex === null ? '' : e.resultIndex + 1, // номер для людей — с единицы
          e.path ? pathText(e.path) : '',
        ])
      }
    }

    const csv = toCsv(
      [
        'Логин',
        'Группа',
        '№ диалога',
        'Диалог',
        'Совпало',
        'С начала, с',
        'Тип события',
        'Описание',
        'Запрос',
        'Найдено',
        '№ результата',
        'Путь',
      ],
      lines,
    )
    return sendCsv(reply, `events-${today()}.csv`, csv)
  })
}
