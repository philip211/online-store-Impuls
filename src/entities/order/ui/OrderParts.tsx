import clsx from 'clsx'
import { Link } from 'react-router'

import { routes } from '@/shared/config'
import { formatDate, formatPrice } from '@/shared/lib'

import { ORDER_STATUS_LABELS, statusTone } from '../model/status'
import type { Order, OrderItem, OrderStatus, TrackingStep } from '../model/types'
import s from './order.module.css'

export function OrderStatusTag({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={clsx(s.status, s[statusTone(status)], className)}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

export function OrderTimeline({ steps, current }: { steps: TrackingStep[]; current: number }) {
  return (
    <ol className={s.timeline}>
      {steps.map((step, i) => {
        const date = formatDate(new Date(step.date))
        return (
          <li
            key={step.label}
            className={clsx(step.done && s.reached)}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className={s.dot} aria-hidden="true" />
            <div>
              <p className={s.stepLabel}>{step.label}</p>
              <p className={s.stepMeta}>
                {step.done ? date : `Ожидается ${date}`} · {step.detail}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Ordered items; names link to the product page unless `linked` is off. */
export function OrderLines({ items, linked = true }: { items: OrderItem[]; linked?: boolean }) {
  return (
    <ul className={s.lines}>
      {items.map((item) => (
        <li key={`${item.productId}|${item.colorName}|${item.option}`}>
          <div>
            {linked ? (
              <Link to={routes.product(item.slug)} viewTransition className={s.lineName}>
                {item.name}
              </Link>
            ) : (
              <span className={s.lineName}>{item.name}</span>
            )}
            <p className={s.lineMeta}>
              {[item.colorName, item.option].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className={s.lineSum}>
            <p>{formatPrice(item.lineTotal)}</p>
            <p className={s.lineMeta}>
              {item.qty} × {formatPrice(item.unitPrice)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotals({
  order,
}: {
  order: Pick<Order, 'subtotal' | 'shippingCost' | 'total'>
}) {
  return (
    <dl className={s.totals}>
      <div>
        <dt>Товары</dt>
        <dd>{formatPrice(order.subtotal)}</dd>
      </div>
      <div>
        <dt>Доставка</dt>
        <dd>{order.shippingCost ? formatPrice(order.shippingCost) : 'Бесплатно'}</dd>
      </div>
      <div>
        <dt>Итого</dt>
        <dd>{formatPrice(order.total)}</dd>
      </div>
    </dl>
  )
}
