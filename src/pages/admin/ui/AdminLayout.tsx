import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router'

import { useIsAdmin, useUser } from '@/entities/session'
import { routes } from '@/shared/config'
import { Container, text } from '@/shared/ui'

import { adminQueries } from '../api/admin-api'
import { ROLE_LABELS } from '../model/labels'
import s from './admin.module.css'

function Count({ value }: { value: number | undefined }) {
  if (!value) return null
  return (
    <>
      <span className={s.navCount} aria-hidden="true">
        {value}
      </span>
      <span className={text.srOnly}>, ждут: {value}</span>
    </>
  )
}

/** Staff area. Managers see sales and catalogue; people and the audit log are admin-only. */
export function AdminLayout() {
  const user = useUser()
  const admin = useIsAdmin()
  const { data: stats } = useQuery(adminQueries.stats())

  const link = (to: string, label: string, count?: number, end?: boolean) => (
    <li>
      <NavLink to={to} end={end} viewTransition>
        {label}
        <Count value={count} />
      </NavLink>
    </li>
  )

  return (
    <Container page className={s.page}>
      <header className={s.head}>
        <h1 className={s.title}>Управление</h1>
        {user && (
          <p className={s.role}>
            {user.name} · {ROLE_LABELS[user.role]}
          </p>
        )}
      </header>

      <div className={s.layout}>
        <nav aria-label="Разделы управления" className={s.side}>
          <ul>
            {link(routes.admin(), 'Сводка', undefined, true)}
            {link(routes.adminOrders(), 'Заказы')}
            {link(routes.adminProducts(), 'Товары')}
            {link(routes.adminReviews(), 'Отзывы', stats?.pendingReviews)}
            {link(routes.adminReturns(), 'Возвраты', stats?.openReturns)}
            {admin && link(routes.adminUsers(), 'Пользователи')}
            {admin && link(routes.adminAudit(), 'Журнал')}
          </ul>
        </nav>

        <div className={s.main}>
          <Outlet />
        </div>
      </div>
    </Container>
  )
}
