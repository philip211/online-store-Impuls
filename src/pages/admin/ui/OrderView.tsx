import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router'

import {
  formatDateTime,
  ORDER_STATUS_LABELS,
  OrderLines,
  OrderStatusTag,
  OrderTotals,
  type OrderStatus,
} from '@/entities/order'
import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { formatDateRange, formatPrice } from '@/shared/lib'
import { Alert, Button, ChevronLeftIcon, TextArea, text } from '@/shared/ui'

import { adminApi, adminQueries, type AdminOrder } from '../api/admin-api'
import s from './admin.module.css'
import { ListSkeleton, LoadError } from './parts'

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: 'ожидает оплаты',
  WAITING_FOR_CAPTURE: 'ждёт подтверждения',
  SUCCEEDED: 'оплачен',
  CANCELED: 'отменён',
  REFUNDED: 'возвращён',
}

/** The verb on the button, not the state name: managers do things. */
const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Подтвердить',
  ASSEMBLED: 'Собран',
  SHIPPED: 'Передать в доставку',
  OUT_FOR_DELIVERY: 'Передать курьеру',
  READY_FOR_PICKUP: 'Привезли в пункт выдачи',
  DELIVERED: 'Получен покупателем',
  CANCELLED: 'Отменить заказ',
}

function StatusPanel({ order }: { order: AdminOrder }) {
  // The clicked button disappears with the new status: focus goes to the panel heading and
  // the change is announced, instead of focus falling to the page body.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [announce, setAnnounce] = useState('')
  const queryClient = useQueryClient()
  const [comment, setComment] = useState('')
  const mutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      adminApi.changeOrderStatus(order.number, { status, comment: comment.trim() || undefined }),
    // Another manager may have moved the order first: reload it so the buttons match reality.
    onError: () =>
      void queryClient.invalidateQueries({ queryKey: adminQueries.order(order.number).queryKey }),
    onSuccess: (updated) => {
      setComment('')
      setAnnounce(`Статус: ${ORDER_STATUS_LABELS[updated.status]}`)
      requestAnimationFrame(() => headingRef.current?.focus())
      queryClient.setQueryData(adminQueries.order(order.number).queryKey, updated)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })

  const forward = order.nextStatuses.filter((st) => st !== 'CANCELLED')
  const canCancel = order.nextStatuses.includes('CANCELLED')

  const cancel = () => {
    const paid = order.payments.some((p) => p.status === 'SUCCEEDED')
    const question = paid
      ? 'Отменить заказ? Деньги вернутся покупателю на карту, товар — на склад.'
      : 'Отменить заказ? Товар вернётся на склад.'
    if (window.confirm(question)) mutation.mutate('CANCELLED')
  }

  if (!order.nextStatuses.length) {
    return (
      <div className={s.panel}>
        <h3 className={s.h3} ref={headingRef} tabIndex={-1}>
          Статус
        </h3>
        <p className={text.srOnly} role="status">
          {announce}
        </p>
        <OrderStatusTag status={order.status} />
        <p className={`${s.muted} ${s.small}`}>Заказ закрыт, менять больше нечего.</p>
      </div>
    )
  }

  return (
    <div className={s.panel}>
      <h3 className={s.h3} ref={headingRef} tabIndex={-1}>
        Следующий шаг
      </h3>
      <p className={text.srOnly} role="status">
        {announce}
      </p>
      <TextArea
        label="Комментарий в историю — по желанию"
        rows={2}
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className={s.actions}>
        {forward.map((st) => (
          <Button
            key={st}
            size="sm"
            loading={mutation.isPending && mutation.variables === st}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(st)}
          >
            {ACTION_LABELS[st] ?? ORDER_STATUS_LABELS[st]}
          </Button>
        ))}
        {canCancel && (
          <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={cancel}>
            {ACTION_LABELS.CANCELLED}
          </Button>
        )}
      </div>
      {mutation.isError && (
        <Alert>
          {isApiError(mutation.error) ? mutation.error.detail : 'Не получилось сменить статус.'}
        </Alert>
      )}
    </div>
  )
}

export function OrderView() {
  const { number = '' } = useParams()
  const { data: order, isError } = useQuery(adminQueries.order(number))

  const back = (
    <nav aria-label="Хлебные крошки" className={s.crumbs}>
      <Link to={routes.adminOrders()} viewTransition className={s.back}>
        <ChevronLeftIcon size={20} />
        Заказы
      </Link>
    </nav>
  )

  if (isError) {
    return (
      <>
        {back}
        <LoadError />
      </>
    )
  }
  if (!order) {
    return (
      <>
        {back}
        <ListSkeleton rows={3} />
      </>
    )
  }

  const pickup = order.shipping === 'pickup'

  return (
    <article aria-labelledby="order-title">
      <title>{`Заказ ${order.number} — управление Импульсом`}</title>
      {back}
      <header className={s.detailHead}>
        <h2 id="order-title" className={s.detailTitle}>
          {order.number}
        </h2>
        <OrderStatusTag status={order.status} />
      </header>
      <p className={s.muted}>{formatDateTime(order.createdAt)}</p>

      <div className={s.columns}>
        <div>
          <section className={s.block} aria-labelledby="o-items">
            <h3 id="o-items" className={s.h3}>
              Состав
            </h3>
            <OrderLines items={order.items} />
            <OrderTotals order={order} />
          </section>

          <section className={s.block} aria-labelledby="o-customer">
            <h3 id="o-customer" className={s.h3}>
              Покупатель и получение
            </h3>
            <dl className={s.facts}>
              <div>
                <dt>Покупатель</dt>
                <dd>
                  {order.name}
                  {order.userId ? '' : ' · без аккаунта'}
                </dd>
              </div>
              <div>
                <dt>Телефон</dt>
                <dd>
                  <a href={`tel:+${order.phone.replace(/\D/g, '')}`} className={s.rowLink}>
                    {order.phone}
                  </a>
                </dd>
              </div>
              {order.email && (
                <div>
                  <dt>Почта</dt>
                  <dd>{order.email}</dd>
                </div>
              )}
              <div>
                <dt>{pickup ? 'Пункт выдачи' : 'Адрес'}</dt>
                <dd>{[order.address, order.addressExtra].filter(Boolean).join(', ')}</dd>
              </div>
              <div>
                <dt>Обещали</dt>
                <dd>
                  {pickup ? 'В пункте ' : 'Привезти '}
                  {formatDateRange(new Date(order.deliveryFrom), new Date(order.deliveryTo))}
                </dd>
              </div>
              {order.gift && (
                <div>
                  <dt>Подарок</dt>
                  <dd>
                    Упаковать{order.giftMessage ? `, открытка: «${order.giftMessage}»` : ''}
                    {order.noReceipt ? '. Чек не вкладывать' : ''}
                  </dd>
                </div>
              )}
              <div>
                <dt>Оплата</dt>
                <dd>
                  {order.payment === 'card' ? 'Картой онлайн' : 'При получении'}
                  {order.payments.map((p) => (
                    <span key={p.id} className={s.cellMeta}>
                      {formatPrice(p.amount)} — {PAYMENT_STATUS[p.status] ?? p.status}
                      {p.paidAt ? `, ${formatDateTime(p.paidAt)}` : ''}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </section>

          <section className={s.block} aria-labelledby="o-history">
            <h3 id="o-history" className={s.h3}>
              История
            </h3>
            <ol className={s.history}>
              {order.events.map((e, i) => (
                <li key={i}>
                  <span>
                    <span className={s.cellMain}>{ORDER_STATUS_LABELS[e.status]}</span>
                    {e.comment && <span className={s.cellMeta}>{e.comment}</span>}
                  </span>
                  <span className={`${s.muted} ${s.small} ${s.nowrap}`}>
                    {formatDateTime(e.createdAt)}
                    {e.actorId ? '' : ' · система'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className={s.sticky} aria-label="Действия с заказом">
          <StatusPanel order={order} />
        </aside>
      </div>
    </article>
  )
}
