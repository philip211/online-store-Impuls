import { NavLink, Outlet } from 'react-router'

import { LogoutButton } from '@/features/auth'
import { useIsStaff, useUser } from '@/entities/session'
import { routes } from '@/shared/config'
import { ArrowRightIcon, Container, text } from '@/shared/ui'

import s from './account.module.css'

/** Personal area: the same side-navigation layout as the help centre. */
export function AccountLayout() {
  const user = useUser()
  const staff = useIsStaff()

  return (
    <Container page className={s.page}>
      <header className={s.head}>
        <h1 className={text.pageTitle}>Кабинет</h1>
        {user && (
          <p className={s.lead}>
            {user.name} · {user.email}
          </p>
        )}
      </header>

      <div className={s.layout}>
        <nav aria-label="Разделы кабинета" className={s.side}>
          <ul>
            <li>
              <NavLink to={routes.account()} end viewTransition>
                Заказы
              </NavLink>
            </li>
            <li>
              <NavLink to={routes.accountSettings()} viewTransition>
                Профиль и пароль
              </NavLink>
            </li>
            {staff && (
              <li>
                <NavLink to={routes.admin()} viewTransition className={s.staffLink}>
                  Управление магазином
                  <ArrowRightIcon size={16} />
                </NavLink>
              </li>
            )}
          </ul>
          <LogoutButton />
        </nav>

        <div className={s.main}>
          <Outlet />
        </div>
      </div>
    </Container>
  )
}
