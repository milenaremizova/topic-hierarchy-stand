import { describeEvent, formatDuration, pathText } from '@stand/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/endpoints'
import s from './ManagerPage.module.css'

/** траектория одного прохождения: что оператор делал по шагам на тестовом стенде */
export function Trajectory({ runId }: { runId: string }) {
  const q = useQuery({
    queryKey: ['manager', 'trajectory', runId],
    queryFn: () => api.manager.trajectory(runId),
  })

  if (q.isPending) return <p className={s.muted}>Загрузка…</p>
  if (q.error) return <p className={s.error}>{q.error.message}</p>
  if (q.data.events.length === 0) return <p className={s.muted}>Событий нет</p>

  return (
    <ol className={s.trajectory}>
      {q.data.events.map((e, i) => (
        <li key={i}>
          <span className={s.since}>{formatDuration(e.sinceStartMs)}</span>
          <span>
            {describeEvent(e)}
            {e.path && e.path.length > 1 && <span className={s.trajPath}>{pathText(e.path)}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}
