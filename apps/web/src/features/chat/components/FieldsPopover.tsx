import type { ReactNode } from 'react'
import { TopicPicker } from '../../topic-picker/TopicPicker'
import s from './FieldsPopover.module.css'

type Props = {
  leafId: string | null
  onLeafChange: (leafId: string) => void
  /** подсветить обязательное поле после попытки завершить чат без тематики */
  showRequired: boolean
  onApply: () => void
  onCancel: () => void
}

/**
 * окно доп. полей, открывается кнопкой в шапке чата.
 * рабочее поле одно — "тематика обращения". остальные являются заглушками для имитации окружения хелпдеска.
 */
export function FieldsPopover({ leafId, onLeafChange, showRequired, onApply, onCancel }: Props) {
  return (
    <div className={s.popover} role="dialog" aria-label="Дополнительные поля">
      <Field label="Номер счёта">
        <input className={s.stub} disabled placeholder="—" />
      </Field>

      <Field label="Тематика обращения" required>
        <TopicPicker value={leafId} onChange={onLeafChange} invalid={showRequired && !leafId} />
        {showRequired && !leafId && <p className={s.hint}>Заполните обязательные поля</p>}
      </Field>

      <Field label="Тематика обращения 2">
        <select className={s.stub} disabled>
          <option>Выберите значение</option>
        </select>
      </Field>

      <Field label="Нотификации">
        <select className={s.stub} disabled>
          <option>Нет</option>
        </select>
      </Field>

      <div className={s.actions}>
        <button type="button" className={s.apply} onClick={onApply}>
          Применить
        </button>
        <button type="button" className={s.cancel} onClick={onCancel}>
          Отменить
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className={s.field}>
      <div className={s.label}>
        {label}
        {required && <span className={s.star}>*</span>}
      </div>
      <div className={s.control}>{children}</div>
    </div>
  )
}
