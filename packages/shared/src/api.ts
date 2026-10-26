/**
 * Контракты HTTP API: что фронт отправляет и что бэк возвращает.
 */
import type {
  ChatRun,
  HierarchyEvent,
  HierarchyEventType,
  PathSnapshot,
  Role,
  Scenario,
  TestGroup,
  TopicNode,
} from './domain.js'

/** Учётка без секретов - то, что можно отдавать на фронт */
export type PublicAccount = {
  id: string
  login: string
  role: Role
  displayName: string
  group: TestGroup | null
}

export type LoginRequest = { login: string; password: string }
export type MeResponse = { account: PublicAccount }

export type ApiError = { error: string; message: string }

// ——— Оператор ———

export type TopicTreeResponse = { nodes: TopicNode[] }

/** Текущий диалог оператора. scenario без эталона оператор видеть не должен */
export type CurrentRunResponse =
  | { done: true; total: number }
  | {
      done: false
      total: number
      run: ChatRun
      scenario: Omit<Scenario, 'expectedLeafId'>
    }

/** Событие с фронта: id, прохождение и путь сервер проставляет сам */
export type NewHierarchyEvent = Omit<HierarchyEvent, 'id' | 'runId' | 'path'>
export type PostEventsRequest = { events: NewHierarchyEvent[] }
export type PostEventsResponse = { saved: number }

export type CloseRunRequest = { leafId: string }

// ——— Руководитель ———

export type GenerateAccountsRequest = {
  /** Сколько учёток создать в каждой группе */
  manual: number
  search: number
}

/** Пароли видны один раз. сразу после генерации, потом хранится только хеш */
export type GeneratedAccount = PublicAccount & { password: string }
export type GenerateAccountsResponse = { accounts: GeneratedAccount[] }

export type AccountListItem = PublicAccount & {
  createdAt: number
  completedRuns: number
}

export type CloseRunResponse = { run: ChatRun }

/** Одна строка таблицы результатов: завершённый диалог одного оператора */
export type LogRow = {
  runId: string
  account: PublicAccount
  scenario: { id: string; title: string }
  /** Каким по счёту был диалог у оператора (0..4) */
  position: number
  archived: boolean
  closedAt: number
  /** От открытия диалога до завершения, мс */
  durationMs: number
  finalPath: PathSnapshot
  expectedPath: PathSnapshot
  isMatch: boolean
}

export type LogsResponse = { rows: LogRow[] }

export type LogsFilter = {
  group?: TestGroup
  accountId?: string
  scenarioId?: string
  archived?: 'true' | 'false'
}

/** Сброс прохождения: сколько диалогов ушло в архив */
export type ResetAccountResponse = { archived: number }

/** Одно событие в траектории прохождения */
export type TrajectoryEvent = {
  /** Сколько прошло от открытия диалога, мс */
  sinceStartMs: number
  type: HierarchyEventType
  nodeId: string | null
  query: string | null
  resultsCount: number | null
  resultIndex: number | null
  path: PathSnapshot | null
}

export type TrajectoryResponse = { row: LogRow; events: TrajectoryEvent[] }
