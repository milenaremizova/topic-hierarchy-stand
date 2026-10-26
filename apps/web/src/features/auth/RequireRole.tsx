import type { Role } from '@stand/shared'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useMe } from './useMe'

/** пускает на страницу только вошедших с нужной ролью, остальных на вход или домой */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { data: me, isPending } = useMe()

  if (isPending) return null
  if (!me) return <Navigate to="/login" replace />
  if (me.role !== role) return <Navigate to={homeFor(me.role)} replace />
  return children
}

export const homeFor = (role: Role) => (role === 'manager' ? '/manager' : '/chat')
