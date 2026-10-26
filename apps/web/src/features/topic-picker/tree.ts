import type { TopicNode } from '@stand/shared'

export type TopicTree = {
  byId: Map<string, TopicNode>
  /** parentId (null — корень) -> дети, отсортированные по order */
  children: Map<string | null, TopicNode[]>
  leaves: TopicNode[]
}

/** собирает индекс дерева из плоского списка, который отдаёт API */
export function buildTree(nodes: TopicNode[]): TopicTree {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string | null, TopicNode[]>()
  for (const n of nodes) {
    const list = children.get(n.parentId) ?? []
    list.push(n)
    children.set(n.parentId, list)
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order)
  return { byId, children, leaves: nodes.filter((n) => n.level === 4) }
}

/** путь от направления до узла включительно */
export function pathTo(tree: TopicTree, id: string): TopicNode[] {
  const path: TopicNode[] = []
  let cur = tree.byId.get(id)
  while (cur) {
    path.unshift(cur)
    cur = cur.parentId ? tree.byId.get(cur.parentId) : undefined
  }
  return path
}

export const pathLabel = (path: TopicNode[]) => path.map((n) => n.name).join(' › ')
