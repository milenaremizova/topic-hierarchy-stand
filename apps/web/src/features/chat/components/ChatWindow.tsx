import {
  ChevronDown,
  ChevronRight,
  Copy,
  LockOpen,
  Paperclip,
  Smile,
  Square,
  Tag,
  User,
} from 'lucide-react'
import type { ReactNode } from 'react'
import s from './ChatWindow.module.css'

type Props = {
  operatorName: string
  pickerOpen: boolean
  onTogglePicker: () => void
  onCloseChat: () => void
  closing?: boolean
  popover: ReactNode
  children: ReactNode
  tags: ReactNode
}


export function ChatWindow({
  operatorName,
  pickerOpen,
  onTogglePicker,
  onCloseChat,
  closing,
  popover,
  children,
  tags,
}: Props) {
  return (
    <section className={s.window}>
      <header className={s.header}>
        <div className={s.left}>
          <div className={s.chip}>
            <span className={s.chipName}>{operatorName}</span>
            <span className={s.chipIcon}>
              <User size={13} />
            </span>
          </div>
          <button type="button" className={s.iconBtn} disabled>
            <Tag size={13} />
          </button>
          <button
            type="button"
            className={`${s.iconBtn} ${pickerOpen ? s.iconBtnActive : ''}`}
            onClick={onTogglePicker}
            aria-expanded={pickerOpen}
            title="Дополнительные поля"
          >
            <Square size={13} />
          </button>
          <div className={s.tags}>
            <span className={s.sdk}>sdk</span>
            {tags}
          </div>
        </div>

        <div className={s.right}>
          <button type="button" className={s.goto} disabled>
            <ChevronRight size={13} /> Перейти к запросу
          </button>
          <div className={s.finish}>
            <button type="button" onClick={onCloseChat} disabled={closing}>
              Завершить чат
            </button>
            <span className={s.finishCaret}>
              <ChevronDown size={14} />
            </span>
          </div>
        </div>

        {pickerOpen && popover}
      </header>

      {children}

      <footer className={s.composer}>
        <textarea placeholder="Сообщение клиенту" disabled />
        <div className={s.composerBar}>
          <div className={s.tools}>
            <Smile size={15} />
            <Copy size={15} />
            <LockOpen size={15} />
            <Paperclip size={15} />
          </div>
          <button type="button" className={s.send} disabled>
            Отправить
          </button>
        </div>
      </footer>
    </section>
  )
}
