import { ChevronDown, Play, Plus } from 'lucide-react'
import s from './ChatListPanel.module.css'

type Props = {
  /** прогресс цепочки: "диалог 2 из 5" */
  current: number
  total: number
  clientName: string
}

const SECTIONS = ['Группа', 'Неназначенные', 'Все', 'Пропущенные']

/** средняя колонка со списками чатов. Кнопки моковые, для имитации окружения хелпдеска, рабочий только раздел "мои" */
export function ChatListPanel({ current, total, clientName }: Props) {
  return (
    <aside className={s.panel}>
      <div className={s.status}>
        <span className={s.toggle} />
        Offline
      </div>

      <div className={s.actions}>
        <button type="button" className={`${s.split} ${s.green}`} disabled>
          <span>Создать чат</span>
          <Plus size={14} />
        </button>
        <button type="button" className={`${s.split} ${s.blue}`} disabled>
          <span>Взять чат</span>
          <Play size={12} fill="currentColor" />
        </button>
      </div>

      <section className={s.section}>
        <header className={s.sectionHead}>
          Мои <span className={s.count}>1</span>
          <ChevronDown size={14} />
        </header>
        <div className={s.chatItem}>
          <strong>{clientName}</strong>
          <span className={s.progress}>
            Диалог {current} из {total}
          </span>
        </div>
      </section>

      {SECTIONS.map((title) => (
        <section key={title} className={s.section}>
          <header className={s.sectionHead}>
            {title}
            <ChevronDown size={14} />
          </header>
        </section>
      ))}
    </aside>
  )
}
