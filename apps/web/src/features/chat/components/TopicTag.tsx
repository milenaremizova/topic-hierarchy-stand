import { pathLabel, pathTo } from '../../topic-picker/tree'
import { useTopicTree } from '../../topic-picker/useTopicTree'
import s from './TopicTag.module.css'

export function TopicTag({ leafId }: { leafId: string | null }) {
  const { data: tree } = useTopicTree()

  if (!leafId || !tree) return null

  const path = pathTo(tree, leafId)
  const leaf = path[path.length - 1] // последний элемент массива

  return (
    <span className={s.tag} title={pathLabel(path)}>
      {leaf?.name}
    </span>
  )
}
