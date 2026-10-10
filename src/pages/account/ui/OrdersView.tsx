import { useInfiniteQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link } from 'react-router'

import { formatOrderDate, OrderStatusTag } from '@/entities/order'
import { routes } from '@/shared/config'
import { formatPrice, ITEM_FORMS, pluralize } from '@/shared/lib'
import { Alert, ArrowRightIcon, Button, ButtonLink, EmptyState, Skeleton } from '@/shared/ui'

import { accountQueries } from '../api/account-queries'
import s from './account.module.css'

export function OrdersView() {
  const query = useInfiniteQuery(accountQueries.orders())
  const orders = query.data?.pages.flatMap((p) => p.items)

  return (
    <section aria-labelledby="orders-title">
      <title>Мои заказы — Импульс</title>
      <h2 id="orders-title" className={s.h2}>
        Заказы
      </h2>

      {query.isPending && (
        <div className={s.loading} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={s.rowSkeleton} />
          ))}
        </div>
      )}

      {query.isError && <Alert>Не удалось загрузить заказы. Обновите страницу.</Alert>}

      {orders?.length === 0 && (
        <div className={s.list}>
          <EmptyState
            as="h3"
            title="Заказов пока нет"
            description="Здесь появятся заказы, оформленные под этим аккаунтом: статус, состав и сроки доставки."
            action={<ButtonLink to={routes.catalog()}>В каталог</ButtonLink>}
          />
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className={clsx(s.rows, s.list)}>
          {orders.map((o) => {
            const items = o.items.reduce((n, i) => n + i.qty, 0)
            return (
              <li key={o.number}>
                <Link to={routes.accountOrder(o.number)} viewTransition className={s.row}>
                  <span className={s.rowMain}>
                    <span className={s.rowTitle}>{o.number}</span>
                    <span className={s.rowMeta}>
                      {formatOrderDate(o.createdAt)} · {pluralize(items, ITEM_FORMS)}
                    </span>
                    <OrderStatusTag status={o.status} />
                  </span>
                  <span className={s.rowSum}>{formatPrice(o.total)}</span>
                  <ArrowRightIcon className={s.rowArrow} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          variant="secondary"
          className={s.more}
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Показать ещё
        </Button>
      )}
    </section>
  )
}
