import type { AccountListItem, GeneratedAccount } from '@stand/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { api } from '../../api/endpoints'
import { useLogout, useMe } from '../auth/useMe'
import { LogsSection } from './LogSection'
import s from './ManagerPage.module.css'

const GROUP_LABEL = { manual: 'Ручной', search: 'Поиск' } as const

export function ManagerPage() {
  const { data: me } = useMe()
  const logout = useLogout()
  const qc = useQueryClient()
  const [counts, setCounts] = useState({ manual: 10, search: 10 })
  const [fresh, setFresh] = useState<GeneratedAccount[]>([])

  const list = useQuery({ queryKey: ['manager', 'accounts'], queryFn: api.manager.accounts })

  const generate = useMutation({
    mutationFn: api.manager.generate,
    onSuccess: ({ accounts }) => {
      setFresh(accounts)
      void qc.invalidateQueries({ queryKey: ['manager', 'accounts'] })
    },
  })

  const reset = useMutation({
    mutationFn: api.manager.reset,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manager'] }),
  })

  const onReset = (account: AccountListItem) => {
    const ok = window.confirm(
      `Сбросить прохождение ${account.login} (${account.displayName})?\n` +
        'Результаты уйдут в архив, оператор пройдёт 5 диалогов заново.',
    )
    if (ok) reset.mutate(account.id)
  }

  const onGenerate = (e: FormEvent) => {
    e.preventDefault()
    generate.mutate(counts)
  }

  return (
    <div className={s.page}>
      <header className={s.top}>
        <h1>Кабинет руководителя</h1>
        <div className={s.me}>
          {me?.login}
          <button type="button" onClick={() => logout.mutate()}>
            Выйти
          </button>
        </div>
      </header>

      <section className={s.card}>
        <h2>Создать учётные записи операторов</h2>
        <form className={s.form} onSubmit={onGenerate}>
          <label>
            Группа «Ручное тестирование»
            <input
              type="number"
              min={0}
              max={50}
              value={counts.manual}
              onChange={(e) => setCounts({ ...counts, manual: Number(e.target.value) })}
            />
          </label>
          <label>
            Группа «Поисковое тестирование»
            <input
              type="number"
              min={0}
              max={50}
              value={counts.search}
              onChange={(e) => setCounts({ ...counts, search: Number(e.target.value) })}
            />
          </label>
          <button className={s.primary} disabled={generate.isPending}>
            {generate.isPending ? 'Создаём…' : 'Сгенерировать'}
          </button>
        </form>
        {generate.error && <p className={s.error}>{generate.error.message}</p>}

        {fresh.length > 0 && (
          <div className={s.fresh}>
            <p>
              Пароли показываются <b>один раз</b>. Необходимо скачать файл и раздать данные от
              учётных записей для операторов.
            </p>
            <button type="button" className={s.primary} onClick={() => downloadCsv(fresh)}>
              Скачать CSV с паролями
            </button>
          </div>
        )}
      </section>

      <section className={s.card}>
        <h2>Учётные записи</h2>
        {list.isPending && <p>Загрузка…</p>}
        {reset.error && <p className={s.error}>{reset.error.message}</p>}
        {list.data && (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Логин</th>
                <th>ФИО на тестовом стенде</th>
                <th>Роль</th>
                <th>Группа</th>
                <th>Пройдено</th>
                <th /> {/*пустой заголовок над колонкой с кнопками */}
              </tr>
            </thead>
            <tbody>
              {list.data.accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.login}</td>
                  <td>{a.displayName}</td>
                  <td>{a.role === 'manager' ? 'Руководитель' : 'Оператор'}</td>
                  <td>{a.group ? GROUP_LABEL[a.group] : '—'}</td>
                  <td>{a.role === 'operator' ? `${a.completedRuns} из 5` : '—'}</td>
                  <td>
                    {a.role === 'operator' && (
                      <button
                        type="button"
                        className={s.secondary}
                        disabled={reset.isPending}
                        onClick={() => onReset(a)}
                      >
                        Сбросить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {list.data && <LogsSection accounts={list.data.accounts} />}
    </div>
  )
}

function downloadCsv(rows: GeneratedAccount[]) {
  const header = ['Логин', 'Пароль', 'ФИО на стенде', 'Группа', 'Кому выдана']
  const lines = rows.map((r) =>
    [r.login, r.password, r.displayName, r.group ? GROUP_LABEL[r.group] : '', ''].join(';'),
  )
  // BOM в начале, чтобы excel правильно открыл кириллицу
  const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `учётки-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
