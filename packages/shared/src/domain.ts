/**
 * Доменные типы стенда. Используются и на фронте, и на бэке,
 * поэтому описаны один раз здесь.
 */

export type Role = 'manager' | 'operator'

/** Группа теста: каким способом оператору велели выбирать тематику. Стенд ничего не ограничивает. */
export type TestGroup = 'manual' | 'search'

/** Уровни иерархии: 1 — базовое направление, 2 — общая категория, 3 — группа, 4 — конечная тематика */
export type TopicLevel = 1 | 2 | 3 | 4

export const MAX_TOPIC_DEPTH = 4

export type TopicNode = {
  id: string
  parentId: string | null
  level: TopicLevel
  name: string
  order: number
  isLeaf: boolean
}
/** Снимок пути на момент события — чтобы старые логи не ломались, если дерево поменяют */
export type PathSnapshot = { id: string; name: string }[]

export type ScenarioMessage = {
  from: 'client' | 'operator'
  text: string
  /** Время в ленте, просто для вида: "10:14" */
  time: string
}

export type Scenario = {
  id: string
  title: string
  clientName: string
  messages: ScenarioMessage[]
  /** id конечной тематики (уровень 4) — эталон */
  expectedLeafId: string
}

/**
 * pending — запланирован (порядок перемешан при первом входе), ещё не открыт
 * open — оператор сейчас в нём
 * closed — чат завершён
 */
export type ChatRunStatus = 'pending' | 'open' | 'closed'

export type ChatRun = {
  id: string
  accountId: string
  scenarioId: string
  /** Каким по счёту диалог идёт у этого оператора (0..4) */
  position: number
  status: ChatRunStatus
  openedAt: number | null
  closedAt: number | null
  finalLeafId: string | null
  finalPath: PathSnapshot | null
  /** Прохождение сброшено руководителем — в статистику не идёт, но хранится */
  archived: boolean
}

export const HIERARCHY_EVENT_TYPES = [
  'picker_open',
  'picker_close',
  'node_expand',
  'node_collapse',
  'search_input',
  'search_select',
  'leaf_select',
  'apply',
  'clear',
  'close_blocked',
  'chat_close',
] as const

export type HierarchyEventType = (typeof HIERARCHY_EVENT_TYPES)[number]

export type HierarchyEvent = {
  id: string
  runId: string
  /** Время на клиенте, мс. Точнее серверного для замера скорости */
  ts: number
  type: HierarchyEventType
  nodeId?: string
  query?: string
  resultsCount?: number
  /** Позиция выбранного результата поиска (0 — первый) */
  resultIndex?: number
  path?: PathSnapshot
}

/** Способ выбора — не хранится, вычисляется из событий прохождения */
export type SelectionMethod = 'manual' | 'search' | 'mixed' | 'none'
