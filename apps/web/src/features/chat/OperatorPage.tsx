import type { ChatRun, PublicAccount, Scenario } from '@stand/shared'
import { useState } from 'react'
import { useMe } from '../auth/useMe'
import { LogEventContext } from '../topic-picker/logEvent'
import { AppSidebar } from './components/AppSidebar'
import { ChatListPanel } from './components/ChatListPanel'
import { ChatWindow } from './components/ChatWindow'
import { Feed } from './components/Feed'
import { FieldsPopover } from './components/FieldsPopover'
import { TopicTag } from './components/TopicTag'
import s from './OperatorPage.module.css'
import { useCloseRun, useCurrentRun } from './useCurrentRun'
import { useEventLog } from './useEventLog'

export function OperatorPage() {
  const { data: me } = useMe()
  const current = useCurrentRun()

  if (!me) return null

  let content
  if (current.isPending) {
    content = <div className={s.message}>Загрузка диалога…</div>
  } else if (current.error) {
    content = <div className={s.message}>Не удалось загрузить диалог: {current.error.message}</div>
  } else if (current.data.done) {
    content = (
      <div className={s.message}>
        <h2>Тест завершён</h2>
        <p>
          Вы прошли все диалоги: {current.data.total} из {current.data.total}. Спасибо!
        </p>
      </div>
    )
  } else {
    const { run, scenario, total } = current.data
    content = <ChatSession key={run.id} me={me} run={run} scenario={scenario} total={total} />
  }

  return (
    <div className={s.layout}>
      <AppSidebar displayName={me.displayName} />
      {content}
    </div>
  )
}

type SessionProps = {
  me: PublicAccount
  run: ChatRun
  scenario: Omit<Scenario, 'expectedLeafId'>
  total: number
}


function ChatSession({ me, run, scenario, total }: SessionProps) {
  const { log, flush } = useEventLog(run.id)
  const closeRun = useCloseRun(flush)
  const [pickerOpen, setIsPickerOpen] = useState(false)
  const [appliedLeafId, setAppliedLeafId] = useState<string | null>(null)
  const [draftLeafId, setDraftLeafId] = useState<string | null>(null)
  const [triedClose, setTriedClose] = useState(false)

  // нажатие на применение тематики
  const handleApply = () => {
    log('apply', { nodeId: draftLeafId ?? undefined })
    setAppliedLeafId(draftLeafId)
    setIsPickerOpen(false)
  }

  // закрытие окна без применения тематики
  const handleCancel = () => {
    log('picker_close')
    setDraftLeafId(appliedLeafId)
    setIsPickerOpen(false)
  }

  // открытие окна
  const handleTogglePicker = () => {
    if (!pickerOpen) {
      log('picker_open')
      setDraftLeafId(appliedLeafId)
      setIsPickerOpen(true)
    } else {
      handleCancel()
    }
  }

  // попытка завершить без тематики
  const handleCloseChat = () => {
    if (closeRun.isPending) return
    if (!appliedLeafId) {
      log('close_blocked')
      // без обязательного поля чат не завершить
      setTriedClose(true)
      setIsPickerOpen(true)
      return
    }
    closeRun.mutate({ runId: run.id, leafId: appliedLeafId })
  }

  return (
    <LogEventContext value={log}>
      <ChatListPanel current={run.position + 1} total={total} clientName={scenario.clientName} />
      <ChatWindow
        operatorName={me.displayName}
        pickerOpen={pickerOpen}
        onTogglePicker={handleTogglePicker}
        onCloseChat={handleCloseChat}
        closing={closeRun.isPending}
        tags={<TopicTag leafId={appliedLeafId} />}
        popover={
          <FieldsPopover
            leafId={draftLeafId}
            onLeafChange={setDraftLeafId}
            showRequired={triedClose}
            onApply={handleApply}
            onCancel={handleCancel}
          />
        }
      >
        <Feed
          clientName={scenario.clientName}
          operatorName={me.displayName}
          messages={scenario.messages}
          systemLines={closeRun.error ? [`Ошибка: ${closeRun.error.message}`] : []}
        />
      </ChatWindow>
    </LogEventContext>
  )
}
