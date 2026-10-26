import type { NewHierarchyEvent } from '@stand/shared'
import { useCallback, useEffect, useRef } from 'react'
import { api } from '../../api/endpoints'
import type { LogEvent } from '../topic-picker/logEvent'

const FLUSH_EVERY_MS = 3000

/**
 * копилка событий одного прохождения.
 * log() кладёт событие в буфер, flush() отправляет всё накопленное одной пачкой.
 * flush вызывается сам раз в 3 секунды и вручную перед завершением чата.
 */
export function useEventLog(runId: string) {
  // useRef: буфер не виден на экране, перерисовка не нужна
  const buffer = useRef<NewHierarchyEvent[]>([])
  // очередь отправок: следующая пачка уходит только после предыдущей
  const queue = useRef<Promise<void>>(Promise.resolve())

  // 1. положить событие в буфер
  const log: LogEvent = useCallback((type, details = {}) => {
    buffer.current.push({ ts: new Date().getTime(), type, ...details }) // то же, что Date.now()
  }, [])

  // 2. отправить всё накопленное
  const flush = useCallback(() => {
    queue.current = queue.current.then(async () => {
      if (buffer.current.length === 0) return // нечего отправлять

      const batch = buffer.current // забираем все, что накопилось
      buffer.current = []

      try {
        await api.runs.postEvents(runId, { events: batch })
      } catch {
        // сеть сбойнула, тогда пачка вернется в начало буфера, уйдет со следующей отправкой
        buffer.current = [...batch, ...buffer.current]
      }
    })
    return queue.current
  }, [runId])

  // 3. отправляется само раз в 3 секунды, пока диалог открыт
  useEffect(() => {
    const timer = setInterval(() => void flush(), FLUSH_EVERY_MS)
    return () => clearInterval(timer)
  }, [flush])

  return { log, flush }
}
