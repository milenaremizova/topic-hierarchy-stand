import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { MAX_TOPIC_DEPTH, type Scenario, type TopicLevel, type TopicNode } from '@stand/shared'
import { z } from 'zod'
import { config } from '../config.js'

/**
 * Загрузка дерева тематик и сценариев из JSON-файлов в data/.
 * Реальные файлы (topics.json, scenarios.json) под НДА и не коммитятся.
 * Если их нет — берутся *.example.json, чтобы стенд запускался из коробки.
 * Данные читаются один раз при старте: поменяла файл — перезапусти сервер.
 */

const Name = z.string().trim().min(1)
const Id = z.string().trim().min(1)


// Узел либо раздел (есть непустой children), либо конечная тематика (children нет).
// Схема рекурсивная — узел содержит такие же узлы.
type RawNode = { id: string; name: string; children?: RawNode[] }
const TopicNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
  z.strictObject({ id: Id, name: Name, children: z.array(TopicNodeSchema).min(1).optional() }),
)
const TopicsFile = z.object({ nodes: z.array(TopicNodeSchema).min(1) })

const ScenarioSchema = z.object({
  id: Id,
  title: Name,
  clientName: Name,
  messages: z
    .array(
      z.object({
        from: z.enum(['client', 'operator']),
        text: z.string().min(1),
        time: z.string().regex(/^\d{1,2}:\d{2}$/, 'время в формате ЧЧ:ММ'),
      }),
    )
    .min(1),
  expectedLeafId: Id,
})
const ScenariosFile = z.object({ scenarios: z.array(ScenarioSchema).min(1) })

export type StandData = {
  nodes: TopicNode[]
  nodeById: Map<string, TopicNode>
  scenarios: Scenario[]
  scenarioById: Map<string, Scenario>
  sources: { topics: string; scenarios: string }
}

export class DataError extends Error {}

function pickFile(name: string): { file: string; isExample: boolean } {
  const real = path.join(config.dataDir, `${name}.json`)
  if (existsSync(real)) return { file: real, isExample: false }
  const example = path.join(config.dataDir, `${name}.example.json`)
  if (existsSync(example)) return { file: example, isExample: true }
  throw new DataError(`Не найден ни ${real}, ни ${example}`)
}

function readJson<T>(file: string, schema: z.ZodType<T>): T {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    throw new DataError(`${file}: не удалось прочитать JSON — ${(e as Error).message}`)
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw new DataError(`${file}: ошибка формата\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

function flatten(roots: RawNode[]): TopicNode[] {
  const out: TopicNode[] = []
  const walk = (list: RawNode[], parentId: string | null, level: number) => {
    list.forEach((n, order) => {
  if (level > MAX_TOPIC_DEPTH) {
    throw new DataError(`Дерево: «${n.name}» (${n.id}) глубже ${MAX_TOPIC_DEPTH} уровней`)
  }
  const isLeaf = !n.children
  if (isLeaf && level === 1) {
    throw new DataError(`Дерево: у направления «${n.name}» (${n.id}) нет ни одной тематики`)
  }
  out.push({ id: n.id, parentId, level: level as TopicLevel, name: n.name, order, isLeaf })
  if (n.children) walk(n.children, n.id, level + 1)
})
  }
  walk(roots, null, 1)
  return out
}

export function loadStandData(): StandData {
  const topicsSrc = pickFile('topics')
  const scenariosSrc = pickFile('scenarios')

  const nodes = flatten(readJson(topicsSrc.file, TopicsFile).nodes)
  const nodeById = new Map<string, TopicNode>()
  for (const n of nodes) {
    if (nodeById.has(n.id)) throw new DataError(`Дерево: повторяется id "${n.id}"`)
    nodeById.set(n.id, n)
  }

  const scenarios = readJson(scenariosSrc.file, ScenariosFile).scenarios
  const scenarioById = new Map<string, Scenario>()
  for (const s of scenarios) {
  if (scenarioById.has(s.id)) throw new DataError(`Сценарии: повторяется id "${s.id}"`)
  const leaf = nodeById.get(s.expectedLeafId)
  if (!leaf) {
    throw new DataError(`Сценарий "${s.id}": эталон "${s.expectedLeafId}" не найден в дереве`)
  }
  if (!leaf.isLeaf) {
    throw new DataError(
      `Сценарий "${s.id}": эталон "${s.expectedLeafId}" — раздел, а не конечная тематика`,
    )
  }
  scenarioById.set(s.id, s)
}

  return {
    nodes,
    nodeById,
    scenarios,
    scenarioById,
    sources: {
      topics: topicsSrc.file + (topicsSrc.isExample ? ' (пример)' : ''),
      scenarios: scenariosSrc.file + (scenariosSrc.isExample ? ' (пример)' : ''),
    },
  }
}

/** Путь от корня до узла — для снимков в логах */
export function pathTo(data: StandData, nodeId: string): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = []
  let cur = data.nodeById.get(nodeId)
  while (cur) {
    path.unshift({ id: cur.id, name: cur.name })
    cur = cur.parentId ? data.nodeById.get(cur.parentId) : undefined
  }
  return path
}
