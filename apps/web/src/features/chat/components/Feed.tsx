import type { ScenarioMessage } from '@stand/shared'
import { User } from 'lucide-react'
import s from './Feed.module.css'

type Props = {
  clientName: string
  operatorName: string
  messages: ScenarioMessage[]
  systemLines?: string[]
}

export function Feed({ clientName, operatorName, messages, systemLines = [] }: Props) {
  return (
    <div className={s.feed}>
      <DateDivider label="Сегодня" />

      {messages.map((m, i) =>
        m.from === 'client' ? (
          <div key={i} className={s.clientRow}>
            <div className={s.clientAvatar}>
              <User size={22} />
            </div>
            <div className={s.clientBubbles}>
              <div className={s.clientHeader}>
                <span>{clientName}</span>
                <time>{m.time}</time>
              </div>
              <div className={s.clientText}>
                <span>{m.text}</span>
                <time>{m.time}</time>
              </div>
            </div>
          </div>
        ) : (
          <div key={i} className={s.operatorRow}>
            <div className={s.operatorBubble}>
              <div className={s.operatorName}>{operatorName}</div>
              <span>{m.text}</span>
              <time>{m.time}</time>
            </div>
            <div className={s.operatorAvatar} />
          </div>
        ),
      )}

      {systemLines.length > 0 && (
        <div className={s.system}>
          {systemLines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className={s.divider}>
      <span>{label}</span>
    </div>
  )
}
