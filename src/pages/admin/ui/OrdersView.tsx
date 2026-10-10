import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router'

import {
  formatDateTime,
  isOrderStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  OrderStatusTag,
} from '@/entities/order'
import { routes } from '@/shared/config'
import { formatPrice, pluralize } from '@/shared/lib'
import { Select } from '@/shared/ui'

import { adminQueries } from '../api/admin-api'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager, SearchField } from './parts'

const ORDER_FORMS = ['заказ', 'заказа', 'заказов'] as const

export function OrdersView() {
  const { get, page, set } = useListParams()
  const status = get('status')
  const { data, isError, isPlaceholderData } = useQuery(
    adminQueries.orders({
      page,
      limit: 20,
      q: get('q') || undefined,
      status: isOrderStatus(status) ? status : undefined,
    }),
  )

  return (
    <section aria-labelledby="orders-title">
      <title>Заказы — управление Импульсом</title>
      <h2 id="orders-title" className={clsx(s.h2, s.chips)}>
        Заказы
      </h2>

      <div className={s.toolbar}>
        <SearchField label="Поиск" placeholder="Номер, имя, почта или телефон" />
        <Select
          className={s.toolbarSelect}
          label="Статус"
          value={isOrderStatus(status) ? status : ''}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">Все статусы</option>
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st}>
              {ORDER_STATUS_LABELS[st]}
            </option>
          ))}
        </Select>
      </div>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton />}
      {data?.items.length === 0 && <p className={s.empty}>Таких заказов нет.</p>}

      {data && data.items.length > 0 && (
        <div
          className={clsx(s.tableWrap, isPlaceholderData && s.busy)}
          // Scrolls sideways on phones: focusable and named so the keyboard can scroll it too.
          tabIndex={0}
          role="region"
          aria-labelledby="orders-title"
          aria-busy={isPlaceholderData || undefined}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Заказ</th>
                <th scope="col">Покупатель</th>
                <th scope="col">Статус</th>
                <th scope="col">Получение</th>
                <th scope="col" className={s.num}>
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.number}>
                  <td>
                    <Link to={routes.adminOrder(o.number)} viewTransition className={s.rowLink}>
                      {o.number}
                    </Link>
                    <span className={s.cellMeta}>{formatDateTime(o.createdAt)}</span>
                  </td>
                  <td>
                    <span className={s.cellMain}>{o.name}</span>
                    <span className={s.cellMeta}>{o.phone}</span>
                  </td>
                  <td>
                    <OrderStatusTag status={o.status} />
                  </td>
                  <td className={s.nowrap}>
                    {o.shipping === 'courier' ? 'Курьер' : 'Самовывоз'}
                    <span className={s.cellMeta}>
                      {o.payment === 'card' ? 'Картой' : 'При получении'}
                    </span>
                  </td>
                  <td className={s.num}>{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, ORDER_FORMS)} />
    </section>
  )
}
