/** Ошибка, которую обработчик ошибок превратит в аккуратный JSON-ответ */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export const unauthorized = () => new HttpError(401, 'unauthorized', 'Нужно войти')
export const forbidden = () => new HttpError(403, 'forbidden', 'Недостаточно прав')
export const notFound = (what = 'Ресурс') => new HttpError(404, 'not_found', `${what} не найден`)

/** Заглушка для эндпоинтов, которые ещё предстоит написать */
export const notImplemented = (todo: string) =>
  new HttpError(501, 'not_implemented', `Ещё не реализовано: ${todo}`)
