import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router'
import s from './LoginPage.module.css'
import { homeFor } from './RequireRole'
import { useLogin, useMe } from './useMe'

export function LoginPage() {
  const { data: me } = useMe()
  const login = useLogin()
  const [form, setForm] = useState({ login: '', password: '' })

  if (me) return <Navigate to={homeFor(me.role)} replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(form)
  }

  return (
    <div className={s.page}>
      <form className={s.card} onSubmit={onSubmit}>
        <h1 className={s.title}>Вход в стенд</h1>

        <label className={s.field}>
          <span>Логин</span>
          <input
            autoFocus
            autoComplete="username"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
        </label>

        <label className={s.field}>
          <span>Пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        {login.error && <p className={s.error}>{login.error.message}</p>}

        <button className={s.submit} disabled={login.isPending || !form.login || !form.password}>
          {login.isPending ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
