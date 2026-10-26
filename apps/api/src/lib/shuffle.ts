import { randomInt } from 'node:crypto'

/**
 * Перемешать массив (тасование Фишера-Йетса): все порядки равновероятны.
 * Возвращает новый массив, исходный не трогает.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1) // случайный индекс от 0 до i включительно
    ;[a[i], a[j]] = [a[j]!, a[i]!] // поменять местами
  }
  return a
}
