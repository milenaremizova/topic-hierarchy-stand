import type { HierarchyEventType, NewHierarchyEvent } from '@stand/shared'
import { createContext, useContext } from 'react'

/* доп. поля события: какой узел, какой запрос и т.д. */
export type EventDetails = Omit<NewHierarchyEvent, 'ts' | 'type'>
export type LogEvent = (type: HierarchyEventType, details?: EventDetails) => void

export const LogEventContext = createContext<LogEvent>(() => {})

export const useLogEvent = () => useContext(LogEventContext)
