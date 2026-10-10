import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { ORDER_STATUSES, OrderStatusTag } from '@/entities/order'
import { routes } from '@/shared/config'
import { formatPrice, plural } from '@/shared/lib'

import { adminQueries } from '../api/admin-api'
import s from './admin.module.css'
import { ListSkeleton, LoadError } from './parts'

const ORDER_FORMS = ['заказ', 'заказа', 'заказов'] as const

export function DashboardView() {
  const { data: stats, isError } = useQuery(adminQueries.stats())

  if (isError) return <LoadError />
  if (!stats) return <ListSkeleton rows={4} />

  const statuses = ORDER_STATUSES.filter((st) => stats.byStatus[st])

  return (
    <div>
      <title>Сводка — управление Импульсом</title>

      <section className={s.block} aria-labelledby="dash-money">
        <h2 id="dash-money" className={s.h2}>
          Сводка
        </h2>
        <div className={s.hero}>
          <p className={s.muted}>Выручка за 30 дней</p>
          <p className={s.heroValue}>{formatPrice(stats.revenue30d)}</p>
          <p className={s.muted}>
            {stats.orders30d} {plural(stats.orders30d, ORDER_FORMS)} без отменённых и неоплаченных
          </p>
        </div>
        <dl className={s.kpis}>
          <div className={s.kpi}>
            <dt>Заказов сегодня</dt>
            <dd>{stats.ordersToday}</dd>
            <dd className={s.kpiAction}>
              <Link to={routes.adminOrders()} viewTransition className={s.kpiLink}>
                {' '}
                Все заказы{' '}
              </Link>
            </dd>
          </div>
          <div className={s.kpi}>
            <dt>Средний чек</dt>
            <dd>{stats.orders30d ? formatPrice(stats.revenue30d / stats.orders30d) : '—'}</dd>
          </div>
          <div className={s.kpi}>
            <dt>Отзывы ждут модерации</dt>
            <dd>{stats.pendingReviews}</dd>
            <dd className={s.kpiAction}>
              <Link to={routes.adminReviews()} viewTransition className={s.kpiLink}>
                {' '}
                Модерировать{' '}
              </Link>
            </dd>
          </div>
          <div className={s.kpi}>
            <dt>Открытые возвраты</dt>
            <dd>{stats.openReturns}</dd>
            <dd className={s.kpiAction}>
              <Link to={routes.adminReturns()} viewTransition className={s.kpiLink}>
                {' '}
                Разобрать{' '}
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <div className={s.split}>
        <section className={s.block} aria-labelledby="dash-status">
          <h2 id="dash-status" className={s.h3}>
            Заказы по статусам
          </h2>
          {statuses.length ? (
            <table className={`${s.table} ${s.compact}`}>
              <thead>
                <tr>
                  <th scope="col">Статус</th>
                  <th scope="col" className={s.num}>
                    Заказов
                  </th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((st) => (
                  <tr key={st}>
                    <td>
                      <Link to={`${routes.adminOrders()}?status=${st}`} viewTransition>
                        <OrderStatusTag status={st} />
                      </Link>
                    </td>
                    <td className={s.num}>{stats.byStatus[st]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>Заказов пока нет.</p>
          )}
        </section>

        <section className={s.block} aria-labelledby="dash-stock">
          <h2 id="dash-stock" className={s.h3}>
            Заканчиваются
          </h2>
          {stats.lowStock.length ? (
            <table className={`${s.table} ${s.compact}`}>
              <thead>
                <tr>
                  <th scope="col">Товар</th>
                  <th scope="col" className={s.num}>
                    Осталось
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={routes.adminProduct(p.id)} viewTransition className={s.rowLink}>
                        {p.name}
                      </Link>
                    </td>
                    <td className={`${s.num} ${p.stock === 0 ? s.out : ''}`}>
                      {p.stock === 0 ? 'нет' : p.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>Всего хватает: у каждого товара больше трёх штук.</p>
          )}
        </section>
      </div>
    </div>
  )
}
