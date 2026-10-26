import { CircleHelp, IdCard, LogOut, Mail, Menu, MessageCircle, Search, Tag } from 'lucide-react'
import { useLogout } from '../../auth/useMe'
import s from './AppSidebar.module.css'


export function AppSidebar({ displayName }: { displayName: string }) {
  const logout = useLogout()
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')

  return (
    <nav className={s.sidebar}>
      <button className={s.menu} type="button" aria-label="Меню">
        <Menu size={18} />
      </button>
      <div className={s.avatar} title={displayName}>
        {initials}
      </div>
      <ul className={s.icons}>
        <li>
          <Search size={15} />
        </li>
        <li className={s.active}>
          <MessageCircle size={15} />
        </li>
        <li className={s.red}>
          <Mail size={15} />
        </li>
        <li>
          <Tag size={15} />
        </li>
        <li>
          <IdCard size={15} />
        </li>
        <li>
          <CircleHelp size={15} />
        </li>
      </ul>
      <button className={s.logout} type="button" title="Выйти" onClick={() => logout.mutate()}>
        <LogOut size={15} />
      </button>
    </nav>
  )
}
