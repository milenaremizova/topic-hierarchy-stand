import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/endpoints'
import { ApiRequestError } from '../../api/http'

export const ME_KEY = ['me'] as const

/** текущая учетная запись. null значит не вошли */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return (await api.auth.me()).account
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 401) return null
        throw e
      }
    },
    staleTime: Infinity,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.login,
    onSuccess: ({ account }) => qc.setQueryData(ME_KEY, account),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] })
    },
  })
}
