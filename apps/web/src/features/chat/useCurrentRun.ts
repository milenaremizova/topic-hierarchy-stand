import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/endpoints'

const CURRENT_RUN_KEY = ['runs', 'current']

/** текущий диалог оператора (или done, если все пройдены) */
export function useCurrentRun() {
  return useQuery({
    queryKey: CURRENT_RUN_KEY,
    queryFn: api.runs.current, // функция, которая сходит за текущим диалогом
  })
}

export function useCloseRun(flushEvents: () => Promise<void>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ runId, leafId }: { runId: string; leafId: string }) => {
      await flushEvents() // сначала дослать события, а после закрытия сервер их не примет
      return api.runs.close(runId, { leafId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CURRENT_RUN_KEY }),
  })
}
