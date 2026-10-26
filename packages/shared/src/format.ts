import type { HierarchyEvent, PathSnapshot } from './domain.js'

/**
 * Общие функции отображения: ими пользуются и кабинет (на экране), и сервер (в CSV),
 * чтобы фразы и форматы везде были одинаковыми.
 */

/** [Платежи, Пополнение] → «Платежи › Пополнение» */
export const pathText = (path: PathSnapshot) => path.map((n) => n.name).join(' › ')

/** 83 000 мс → «1:23» */
export function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

/** Только поля, нужные для фразы: подходит и событие из БД, и событие траектории */
export type DescribableEvent = Pick<HierarchyEvent, 'type'> & {
  nodeId?: string | null
  query?: string | null
  resultsCount?: number | null
  resultIndex?: number | null
  path?: PathSnapshot | null
}

/** Название узла, которым кончается путь: «Кэшбек не начислен» */
const last = (path?: PathSnapshot | null) => path?.at(-1)?.name ?? '—'

/** Одно событие → фраза для руководителя */
export function describeEvent(e: DescribableEvent): string {
  switch (e.type) {
    case 'picker_open':
      return 'Оператор открыл окно тематик.'
    case 'picker_close':
      return 'Оператор закрыл окно тематик, не применив выбор тематики.'
    case 'node_expand':
      return `Оператор раскрыл раздел "${last(e.path)}" внутри иерархии.`
    case 'node_collapse':
      return `Оператор свернул раздел "${last(e.path)}" внутри иерархии.`
    case 'search_input':
      return `Оператор искал "${e.query}" - найдено ${e.resultsCount} результата, содержащих ввод в поиске.`
    case 'search_select':
      return `Оператор выбрал из поиска ${(e.resultIndex ?? 0) + 1}-й результат из ${e.resultsCount}: "${last(e.path)}".`
    case 'leaf_select':
      return `Оператор выбрал вручную тематику "${last(e.path)}".`
    case 'apply':
      return e.nodeId
        ? `Оператор применил тематику "${last(e.path)}".`
        : 'Нажал "Применить", ничего не выбрав'
    case 'clear':
      return 'Оператор очистил выбор.'
    case 'close_blocked':
      return 'Оператор совершил попытку завершить диалог без проставления тематики.'
    case 'chat_close':
      return `Оператор закрыл чат с тематикой "${last(e.path)}".`
  }
}
