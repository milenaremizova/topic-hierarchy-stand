/**
 * Нормализация строк для поиска по тематикам.
 * Лежит в shared, чтобы при желании искать одинаково и на фронте, и на бэке.
 */

/** Нижний регистр, ё → е, схлопнутые пробелы */
export function normalize(input: string): string {
  return input.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`"
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё'

const enToRu = new Map<string, string>()
for (let i = 0; i < EN.length; i++) {
  enToRu.set(EN[i]!, RU[i]!)
}

/** Перевод из неправильной раскладки: "dsdjl" → "вывод" */
export function fromWrongLayout(input: string): string {
  return Array.from(input.toLowerCase())
    .map((ch) => enToRu.get(ch) ?? ch)
    .join('')
}

/** Варианты запроса, по которым стоит искать: как ввели и в исправленной раскладке */
export function queryVariants(input: string): string[] {
  const direct = normalize(input)
  const fixed = normalize(fromWrongLayout(input))
  return direct === fixed ? [direct] : [direct, fixed]
}
