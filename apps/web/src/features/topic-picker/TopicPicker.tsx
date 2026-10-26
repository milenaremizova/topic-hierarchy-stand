import type { TopicNode } from '@stand/shared'
import { normalize, queryVariants } from '@stand/shared'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLogEvent } from './logEvent'
import s from './TopicPicker.module.css'
import { pathTo, type TopicTree } from './tree'
import { useTopicTree } from './useTopicTree'

type Props = {
  value: string | null
  onChange: (leafId: string) => void
  invalid?: boolean
}

export function TopicPicker({ value, onChange, invalid }: Props) {
  const { data: tree, isPending, error } = useTopicTree()

  if (isPending) return <div className={s.box}>Загрузка…</div>
  if (error) return <div className={s.box}>Не удалось загрузить тематики</div>

  return <Accordion tree={tree} value={value} onChange={onChange} invalid={invalid} />
}

function Accordion({ tree, value, onChange, invalid }: Props & { tree: TopicTree }) {
  // id открытых разделов по уровням: ['d-order', 'c-order-delivery']
  const [openPath, setOpenPath] = useState<string[]>(() =>
    value
      ? pathTo(tree, value)
          .slice(0, -1)
          .map((n) => n.id)
      : [],
  )

  const [query, setQuery] = useState('')

  const log = useLogEvent()

  const selectLeaf = (node: TopicNode) => {
    log('leaf_select', { nodeId: node.id })
    onChange(node.id)
  }

  const toggle = (node: TopicNode) => {
    const prefix = openPath.slice(0, node.level - 1)

    if (openPath[node.level - 1] === node.id) {
      log('node_collapse', { nodeId: node.id })
      setOpenPath(prefix) // был открыт -> свернуть
    } else {
      log('node_expand', { nodeId: node.id })
      setOpenPath([...prefix, node.id]) // не был -> открыть, соседа заменить
    }
  }

  const pickResult = (node: TopicNode, index: number) => {
    log('search_select', {
      nodeId: node.id,
      query,
      resultsCount: results.length,
      resultIndex: index,
    })

    const ids = pathTo(tree, node.id).map((n) => n.id)
    if (node.isLeaf) {
      onChange(node.id)
      setOpenPath(ids.slice(0, -1)) // раскрыть до тематики (саму её не открываем)
    } else {
      setOpenPath(ids) // раскрыть до раздела включительно
    }
    setQuery('') // выйти из поиска обратно в аккордеон
  }

  const variants = queryVariants(query)
  const matches = query.trim()
    ? [...tree.byId.values()].filter((node) => {
        const name = normalize(node.name)
        return variants.some((v) => name.includes(v))
      })
    : []
  const results = [...matches.filter((n) => n.isLeaf), ...matches.filter((n) => !n.isLeaf)]
  const resultsCount = results.length

  useEffect(() => {
    if (!query.trim()) return // поле пустое, значит писать нечего
    const timer = setTimeout(() => log('search_input', { query, resultsCount }), 500)
    return () => clearTimeout(timer)
  }, [query, resultsCount, log])

  const renderLevel = (parentId: string | null) => {
    const nodes = tree.children.get(parentId) ?? []

    return (
      <ul className={s.list}>
        {nodes.map((node) => {
          const isLeaf = node.isLeaf
          const isOpen = openPath[node.level - 1] === node.id
          const isSelected = node.id === value

          const rowClass = [
            s.row,
            isLeaf ? s.leaf : s.branch,
            isOpen ? s.open : '',
            isSelected ? s.selected : '',
          ].join(' ')

          return (
            <li key={node.id}>
              <button
                type="button"
                className={rowClass}
                // отступ растёт с глубиной: 1-ый уровень - 10px, каждый следующий +16px
                style={{ paddingLeft: 10 + (node.level - 1) * 16 }}
                onClick={() => (isLeaf ? selectLeaf(node) : toggle(node))}
                aria-expanded={isLeaf ? undefined : isOpen}
              >
                {isLeaf ? (
                  <span className={s.dot} aria-hidden="true" />
                ) : (
                  <ChevronRight size={14} className={s.chevron} aria-hidden="true" />
                )}
                {node.name}
              </button>

              {isOpen && renderLevel(node.id)}
            </li>
          )
        })}
      </ul>
    )
  }

  const renderResults = () => {
    if (results.length === 0) {
      return <p className={s.empty}>Ничего не найдено</p>
    }

    return (
      <ul className={s.list}>
        {results.map((node, i) => {
          const parents = pathTo(tree, node.id)
            .slice(0, -1)
            .map((n) => n.name)
            .join(' › ')
          return (
            <li key={node.id}>
              <button
                type="button"
                className={`${s.row} ${s.result}`}
                onClick={() => pickResult(node, i)}
              >
                <span className={s.resultPath}>{parents}</span>
                <span className={s.resultName}>
                  {node.isLeaf ? (
                    <span className={s.dot} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                  <span>{highlight(node.name, variants)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className={s.picker}>
      <input
        className={s.search}
        placeholder="Поиск по тематикам"
        aria-label="Поиск по тематикам"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={`${s.box} ${invalid ? s.invalid : ''}`}>
        {query.trim() ? renderResults() : renderLevel(null)}
      </div>
    </div>
  )
}

function highlight(text: string, variants: string[]): ReactNode {
  const searchable = text.toLowerCase().replace(/ё/g, 'е')

  for (const v of variants) {
    const start = searchable.indexOf(v) // где v встречается в searchable (-1, если нигде)
    if (start === -1) continue // этот вариант не нашёлся -> пробуем следующий

    const end = start + v.length // индекс сразу после совпадения

    return (
      <>
        {text.slice(0, start)}
        <mark className={s.mark}>{text.slice(start, end)}</mark>
        {text.slice(end)}
      </>
    )
  }

  return text // ни один вариант не совпал -> показываем как есть
}
