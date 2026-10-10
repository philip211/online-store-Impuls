import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import {
  formatOrderDate,
  OrderLines,
  OrderStatusTag,
  OrderTimeline,
  OrderTotals,
} from '@/entities/order'
import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { formatDateRange } from '@/shared/lib'
import { buttonClass, ButtonLink, ChevronLeftIcon, EmptyState, Skeleton } from '@/shared/ui'

import { accountQueries } from '../api/account-queries'
import s from './account.module.css'

export function OrderView() {
  const { number = '' } = useParams()
  const { data: order, error, isPending } = useQuery(accountQueries.order(number))

  const back = (
    <nav aria-label="Хлебные крошки" className={s.crumbs}>
      <Link to={routes.account()} viewTransition className={s.back}>
        <ChevronLeftIcon size={20} />
        Все заказы
      </Link>
    </nav>
  )

  if (isPending) {
    return (
      <div aria-busy="true">
        {back}
        <Skeleton className={s.rowSkeleton} />
      </div>
    )
  }

  if (!order) {
    const missing = isApiError(error, 'NOT_FOUND') || isApiError(error, 'VALIDATION_FAILED')
    return (
      <>
        {back}
        <EmptyState
          title={missing ? 'Такого заказа нет' : 'Не удалось загрузить заказ'}
          description={
            missing
              ? 'Возможно, он оформлен без входа в аккаунт — его статус можно узнать по номеру и телефону.'
              : 'Проверьте соединение и обновите страницу.'
          }
          action={
            missing ? (
              <ButtonLink to={routes.help('order-status')} variant="secondary">
                Найти по номеру
              </ButtonLink>
            ) : undefined
          }
        />
      </>
    )
  }

  const payUrl = order.status === 'PENDING_PAYMENT' ? order.paymentInfo?.confirmationUrl : null
  const pickup = order.shipping === 'pickup'

  return (
    <article aria-labelledby="order-title">
      <title>{`Заказ ${order.number} — Импульс`}</title>
      {back}

      <header className={s.orderHead}>
        <h2 id="order-title" className={s.orderTitle}>
          {order.number}
        </h2>
        <OrderStatusTag status={order.status} />
      </header>
      <p className={s.muted}>от {formatOrderDate(order.createdAt)}</p>

      {payUrl && (
        <div className={s.notice} role="status">
          <span>Заказ ждёт оплаты — товар зарезервирован.</span>
          <a href={payUrl} className={buttonClass({ size: 'sm' })}>
            Оплатить
          </a>
        </div>
      )}

      <section className={s.block} aria-labelledby="order-progress">
        <h3 id="order-progress" className={s.h2}>
          {order.tracking.cancelled ? 'Заказ отменён' : 'Где заказ'}
        </h3>
        {!order.tracking.cancelled && (
          <OrderTimeline steps={order.tracking.steps} current={order.tracking.current} />
        )}
      </section>

      <section className={s.block} aria-labelledby="order-items">
        <h3 id="order-items" className={s.h2}>
          Состав
        </h3>
        <OrderLines items={order.items} />
        <OrderTotals order={order} />
      </section>

      <section className={s.block} aria-labelledby="order-delivery">
        <h3 id="order-delivery" className={s.h2}>
          Получение
        </h3>
        <dl className={s.facts}>
          <div>
            <dt>{pickup ? 'В пункте выдачи' : 'Доставка курьером'}</dt>
            <dd>{formatDateRange(new Date(order.deliveryFrom), new Date(order.deliveryTo))}</dd>
          </div>
          <div>
            <dt>{pickup ? 'Пункт выдачи' : 'Адрес'}</dt>
            <dd>{[order.address, order.addressExtra].filter(Boolean).join(', ')}</dd>
          </div>
          <div>
            <dt>Получатель</dt>
            <dd>
              {order.name}, {order.phone}
            </dd>
          </div>
          <div>
            <dt>Оплата</dt>
            <dd>{order.payment === 'card' ? 'Картой онлайн' : 'При получении'}</dd>
          </div>
          {order.gift && (
            <div>
              <dt>Подарок</dt>
              <dd>
                {order.giftMessage
                  ? `Подарочная упаковка, открытка: «${order.giftMessage}»`
                  : 'Подарочная упаковка'}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </article>
  )
}
