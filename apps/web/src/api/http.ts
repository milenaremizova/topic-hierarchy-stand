import type { ApiError } from '@stand/shared'

/** ошибка, которую вернул сервер: status - HTTP-код (400, 401…), code - код ошибки из ответа ('leaf_required' и т.п.) */
export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

/** запрос к API: шлёт cookie сессии и JSON, возвращает ответ с типом T, при ошибке бросает ApiRequestError */
export async function http<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: {
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null
    throw new ApiRequestError(res.status, body?.error ?? 'unknown', body?.message ?? res.statusText)
  }
  return (await res.json()) as T
}
