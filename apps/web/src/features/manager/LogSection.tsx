import type { AccountListItem, LogsFilter, TestGroup } from '@stand/shared'
import { formatDuration, pathText } from '@stand/shared'
import { useQuery } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { api } from '../../api/endpoints'
import s from './ManagerPage.module.css'
import { Trajectory } from './Trajectory'

const GROUP_LABEL = { manual: 'Ручной', search: 'Поиск' } as const

/** таблица результатов тестирования операторов: кто, какой диалог, что выбрал, совпало ли с эталоном */
export function LogsSection({ accounts }: { accounts: AccountListItem[] }) {
  const [filter, setFilter] = useState<LogsFilter>({})
  const [openRunId, setOpenRunId] = useState<string | null>(null)

  // фильтр входит в ключ: при смене фильтра react query считает это новым запросом и загружает данные заново
  const logs = useQuery({
    queryKey: ['manager', 'logs', filter],
    queryFn: () => api.manager.logs(filter),
  })

  const operators = accounts.filter((a) => a.role === 'operator') // только операторы, без руководителя
  const rows = logs.data?.rows ?? []
  const matched = rows.filter((r) => r.isMatch).length // сколько совпало с эталоном

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h2>Результаты</h2>
        <div className={s.headActions}>
          <a className={s.secondary} href={api.manager.logsCsvUrl(filter)}>
            Скачать таблицу
          </a>
          <a className={s.secondary} href={api.manager.eventsCsvUrl(filter)}>
            Скачать события
          </a>
          <button type="button" className={s.secondary} onClick={() => void logs.refetch()}>
            Обновить
          </button>
        </div>
      </div>

      <div className={s.filters}>
        <label>
          Группа
          <select
            value={filter.group ?? ''}
            onChange={(e) =>
              setFilter({
                ...filter,
                group: (e.target.value || undefined) as TestGroup | undefined,
              })
            }
          >
            <option value="">Все</option>
            <option value="manual">Ручной</option>
            <option value="search">Поиск</option>
          </select>
        </label>

        <label>
          Оператор
          <select
            value={filter.accountId ?? ''}
            onChange={(e) => setFilter({ ...filter, accountId: e.target.value || undefined })}
          >
            <option value="">Все</option>
            {operators.map((a) => (
              <option key={a.id} value={a.id}>
                {a.login} — {a.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={filter.archived === 'true'}
            onChange={(e) =>
              setFilter({ ...filter, archived: e.target.checked ? 'true' : undefined })
            }
          />
          Показывать архив
        </label>
      </div>

      {logs.isPending && <p>Загрузка…</p>}
      {logs.error && <p className={s.error}>{logs.error.message}</p>}

      {logs.data && rows.length === 0 && <p className={s.muted}>Пока нет завершённых диалогов</p>}

      {rows.length > 0 && (
        <>
          <p className={s.summary}>
            Совпало с эталоном: <b>{matched}</b> из {rows.length} (
            {Math.round((matched / rows.length) * 100)}%)
          </p>

          <table className={s.table}>
            <thead>
              <tr>
                <th>Оператор</th>
                <th>Группа</th>
                <th>№</th>
                <th>Диалог</th>
                <th>Выбрал</th>
                <th>Эталон</th>
                <th>Совпало</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.runId}>
                  <tr
                    className={`${s.clickable} ${r.archived ? s.archived : ''}`}
                    onClick={() => setOpenRunId(openRunId === r.runId ? null : r.runId)}
                  >
                    <td title={r.account.displayName}>{r.account.login}</td>
                    <td>{r.account.group ? GROUP_LABEL[r.account.group] : '—'}</td>
                    <td>{r.position + 1}</td>
                    <td>{r.scenario.title}</td>
                    <td className={s.path}>{pathText(r.finalPath)}</td>
                    <td className={s.path}>{pathText(r.expectedPath)}</td>
                    <td className={r.isMatch ? s.match : s.miss}>{r.isMatch ? 'Да' : 'Нет'}</td>
                    <td>{formatDuration(r.durationMs)}</td>
                  </tr>
                  {openRunId === r.runId && (
                    <tr className={s.detail}>
                      <td colSpan={8}>
                        <Trajectory runId={r.runId} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
