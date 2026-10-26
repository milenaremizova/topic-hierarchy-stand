import {
  HIERARCHY_EVENT_TYPES,
  type ChatRun,
  type CloseRunResponse,
  type CurrentRunResponse,
  type PostEventsResponse,
} from '@stand/shared'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { currentAccount, requireRole } from '../auth/session.js'
import { pathTo } from '../data/load.js'
import { db } from '../db/client.js'
import { accounts, chatRuns, hierarchyEvents, type ChatRunRow } from '../db/schema.js'
import { HttpError, notFound } from '../lib/errors.js'
import { shuffle } from '../lib/shuffle.js'

const RunParams = z.object({ runId: z.uuid() })
const CloseBody = z.object({ leafId: z.string().min(1) })

// chat_close пишет только сервер при завершении — с фронта не принимаем
const ClientEvent = z.object({
  ts: z.number().int().positive(),
  type: z.enum(HIERARCHY_EVENT_TYPES).exclude(['chat_close']),
  nodeId: z.string().max(200).optional(),
  query: z.string().max(200).optional(),
  resultsCount: z.number().int().min(0).optional(),
  resultIndex: z.number().int().min(0).optional(),
})
const EventsBody = z.object({ events: z.array(ClientEvent).min(1).max(500) })

function toChatRun(row: ChatRunRow): ChatRun {
  return {
    ...row,
    openedAt: row.openedAt ? row.openedAt.getTime() : null,
    closedAt: row.closedAt ? row.closedAt.getTime() : null,
    finalPath: row.finalPath ?? null,
  }
}

/** Маршруты оператора: цепочка диалогов, события выбора, завершение */
export async function runsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireRole('operator'))

  /** GET /api/runs/current — текущий диалог (при первом входе создаёт перемешанную цепочку) */
  app.get('/current', async (req): Promise<CurrentRunResponse> => {
    const account = currentAccount(req)
    const { scenarios } = app.standData

    return db.transaction(async (tx) => {
      // 0. Очередь: второй запрос этой же учётки подождёт, пока закончится первый
      await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, account.id))
        .for('update')

      // Неархивные прохождения учётки по порядку. Функция — потому что вызовем дважды
      const loadRuns = () =>
        tx
          .select()
          .from(chatRuns)
          .where(and(eq(chatRuns.accountId, account.id), eq(chatRuns.archived, false)))
          .orderBy(asc(chatRuns.position))

      let runs = await loadRuns()

      // 1. Первый вход — создать прохождения в случайном порядке
      if (runs.length === 0) {
        const order = shuffle(scenarios.map((sc) => sc.id))
        await tx.insert(chatRuns).values(
          order.map((scenarioId, position) => ({
            id: randomUUID(),
            accountId: account.id,
            scenarioId,
            position,
          })),
        )
        runs = await loadRuns()
      }

      const total = runs.length

      // 2. Первое незавершённое
      let run = runs.find((r) => r.status !== 'closed')
      if (!run) return { done: true, total }

      // 3. Открываем, если ещё не открыт
      if (run.status === 'pending') {
        const [opened] = await tx
          .update(chatRuns)
          .set({ status: 'open', openedAt: new Date() })
          .where(eq(chatRuns.id, run.id))
          .returning()
        run = opened!
      }

      // 4. Сценарий — без эталона
      const scenario = scenarios.find((sc) => sc.id === run.scenarioId)
      if (!scenario) {
        throw new HttpError(500, 'scenario_missing', `Сценарий ${run.scenarioId} пропал из файла`)
      }

      return {
        done: false,
        total,
        run: toChatRun(run),
        scenario: {
          id: scenario.id,
          title: scenario.title,
          clientName: scenario.clientName,
          messages: scenario.messages,
        },
      }
    })
  })

  /** POST /api/runs/:runId/events — пачка событий выбора тематики с фронта */
  app.post('/:runId/events', async (req): Promise<PostEventsResponse> => {
    const account = currentAccount(req)
    const { runId } = RunParams.parse(req.params)
    const { events } = EventsBody.parse(req.body)

    // Прохождение: с таким id, этого оператора, не архивное
    const [run] = await db
      .select({ id: chatRuns.id, status: chatRuns.status })
      .from(chatRuns)
      .where(
        and(
          eq(chatRuns.id, runId),
          eq(chatRuns.accountId, account.id),
          eq(chatRuns.archived, false),
        ),
      )
    if (!run) throw notFound('Диалог')
    if (run.status !== 'open') {
      throw new HttpError(409, 'run_not_open', 'Диалог уже завершён')
    }

    const { nodeById } = app.standData
    await db.insert(hierarchyEvents).values(
      events.map((e) => ({
        id: randomUUID(),
        runId: run.id,
        ts: new Date(e.ts),
        type: e.type,
        nodeId: e.nodeId ?? null,
        query: e.query ?? null,
        resultsCount: e.resultsCount ?? null,
        resultIndex: e.resultIndex ?? null,
        // Путь считаем сами по дереву
        path: e.nodeId && nodeById.has(e.nodeId) ? pathTo(app.standData, e.nodeId) : null,
      })),
    )

    return { saved: events.length }
  })

  /** POST /api/runs/:runId/close — завершить чат с выбранной тематикой */
  app.post('/:runId/close', async (req): Promise<CloseRunResponse> => {
    const account = currentAccount(req)
    const { runId } = RunParams.parse(req.params)
    const { leafId } = CloseBody.parse(req.body)

    // 1. Тематика: есть в дереве и конечная
    const leaf = app.standData.nodeById.get(leafId)
    if (!leaf || !leaf.isLeaf) {
      throw new HttpError(400, 'leaf_required', 'Заполните обязательные поля')
    }

    return db.transaction(async (tx) => {
      // 2. Прохождение: с таким id, этого оператора, не архивное. FOR UPDATE — против двойного клика
      const [run] = await tx
        .select()
        .from(chatRuns)
        .where(
          and(
            eq(chatRuns.id, runId),
            eq(chatRuns.accountId, account.id),
            eq(chatRuns.archived, false),
          ),
        )
        .for('update')
      if (!run) throw notFound('Диалог')
      if (run.status !== 'open') {
        throw new HttpError(409, 'run_not_open', 'Этот диалог сейчас нельзя завершить')
      }

      // 3. Результат
      const now = new Date()
      const finalPath = pathTo(app.standData, leafId)

      const [closed] = await tx
        .update(chatRuns)
        .set({ status: 'closed', closedAt: now, finalLeafId: leafId, finalPath })
        .where(eq(chatRuns.id, run.id))
        .returning()

      // 4. Событие в лог
      await tx.insert(hierarchyEvents).values({
        id: randomUUID(),
        runId: run.id,
        ts: now,
        type: 'chat_close',
        nodeId: leafId,
        path: finalPath,
      })

      return { run: toChatRun(closed!) }
    })
  })
}
