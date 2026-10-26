import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/endpoints'
import { buildTree } from './tree'

/** дерево грузится один раз за сессию и дальше берётся из кеша */
export function useTopicTree() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: async () => buildTree((await api.topics.tree()).nodes),
    staleTime: Infinity,
  })
}
