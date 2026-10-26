import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { homeFor, RequireRole } from '../features/auth/RequireRole'
import { useMe } from '../features/auth/useMe'
import { OperatorPage } from '../features/chat/OperatorPage'
import { ManagerPage } from '../features/manager/ManagerPage'

/**
 * главная страница «/». своего содержимого у неё нет: она только перенаправляет
 * оператора в окно чата, руководителя в кабинет, а того, кто не вошёл, на страницу входа.
 * пока неизвестно, вошёл ли пользователь (запрос /auth/me ещё идёт), ничего не показываем.
 */
function Home() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  return <Navigate to={me ? homeFor(me.role) : '/login'} replace />
}

/**
 * все страницы тестового стенда.
 * /chat и /manager закрыты RequireRole: без входа —> на /login, с чужой ролью —> на свою страницу.
 * любой неизвестный адрес ведёт на «/», а оттуда, куда положено по роли.
 */
export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/chat',
    element: (
      <RequireRole role="operator">
        <OperatorPage />
      </RequireRole>
    ),
  },
  {
    path: '/manager',
    element: (
      <RequireRole role="manager">
        <ManagerPage />
      </RequireRole>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
