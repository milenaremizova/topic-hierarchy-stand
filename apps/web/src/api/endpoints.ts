import type {
  AccountListItem,
  CloseRunRequest,
  CloseRunResponse,
  CurrentRunResponse,
  GenerateAccountsRequest,
  GenerateAccountsResponse,
  LoginRequest,
  LogsFilter,
  LogsResponse,
  MeResponse,
  PostEventsRequest,
  PostEventsResponse,
  ResetAccountResponse,
  TopicTreeResponse,
  TrajectoryResponse,
} from '@stand/shared'
import { http } from './http'

export const api = {
  auth: {
    me: () => http<MeResponse>('/auth/me'),
    login: (body: LoginRequest) => http<MeResponse>('/auth/login', { method: 'POST', json: body }),
    logout: () => http<{ ok: true }>('/auth/logout', { method: 'POST' }),
  },
  topics: {
    tree: () => http<TopicTreeResponse>('/topics'),
  },
  manager: {
    accounts: () => http<{ accounts: AccountListItem[] }>('/manager/accounts'),
    generate: (body: GenerateAccountsRequest) =>
      http<GenerateAccountsResponse>('/manager/accounts/generate', { method: 'POST', json: body }),
    logs: (filter: LogsFilter) => http<LogsResponse>(`/manager/logs${toQuery(filter)}`),
    reset: (accountId: string) =>
      http<ResetAccountResponse>(`/manager/accounts/${accountId}/reset`, { method: 'POST' }),
    trajectory: (runId: string) => http<TrajectoryResponse>(`/manager/logs/${runId}`),
    /* браузер скачает файл сам по ссылке, cookie сессии уйдёт вместе с ним */
    logsCsvUrl: (filter: LogsFilter) => `/api/manager/logs.csv${toQuery(filter)}`,
    eventsCsvUrl: (filter: LogsFilter) => `/api/manager/events.csv${toQuery(filter)}`,
  },
  runs: {
    current: () => http<CurrentRunResponse>('/runs/current'),
    close: (runId: string, body: CloseRunRequest) =>
      http<CloseRunResponse>(`/runs/${runId}/close`, { method: 'POST', json: body }),
    postEvents: (runId: string, body: PostEventsRequest) =>
      http<PostEventsResponse>(`/runs/${runId}/events`, { method: 'POST', json: body }),
  },
}

/** { group: 'manual', accountId: undefined } → '?group=manual'. Пустые значения пропускаем */
function toQuery(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value)
  }
  const str = qs.toString()
  return str ? `?${str}` : ''
}
