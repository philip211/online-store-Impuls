import type { OrderStatus, ShippingMethod } from '../../../../generated/prisma/client'

/**
 * Allowed status changes. Anything else is rejected, so an order cannot jump from "paid"
 * to "delivered" or come back from "cancelled".
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ASSEMBLED', 'CANCELLED'],
  ASSEMBLED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus, method: ShippingMethod): boolean {
  if (!TRANSITIONS[from].includes(to)) return false
  // The last mile depends on how the order travels.
  if (to === 'OUT_FOR_DELIVERY') return method === 'courier'
  if (to === 'READY_FOR_PICKUP') return method === 'pickup'
  return true
}

export const nextStatuses = (from: OrderStatus, method: ShippingMethod) =>
  TRANSITIONS[from].filter((to) => canTransition(from, to, method))

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Ждёт оплаты',
  CONFIRMED: 'Оформлен',
  ASSEMBLED: 'Собран на складе',
  SHIPPED: 'Передан в доставку',
  OUT_FOR_DELIVERY: 'У курьера',
  READY_FOR_PICKUP: 'Ждёт в пункте выдачи',
  DELIVERED: 'Получен',
  CANCELLED: 'Отменён',
}

/** Stock is back on the shelf when an order is cancelled before it reached the customer. */
export const holdsStock = (s: OrderStatus) => s !== 'CANCELLED' && s !== 'DELIVERED'

/* Tracking: the five steps the storefront timeline shows. */

export type TrackingStep = { label: string; detail: string; date: string; done: boolean }
export type Tracking = {
  number: string
  method: ShippingMethod
  status: OrderStatus
  statusLabel: string
  cancelled: boolean
  steps: TrackingStep[]
  /** Index of the latest completed step; -1 while the order waits for payment. */
  current: number
}

const stepsFor = (method: ShippingMethod) => [
  { label: 'Оформлен', detail: 'Подтвердили состав и адрес' },
  { label: 'Собран на складе', detail: 'Проверили комплектность и упаковали' },
  { label: 'Передан в доставку', detail: 'Посылка у службы доставки' },
  method === 'courier'
    ? { label: 'У курьера', detail: 'Курьер позвонит за час до приезда' }
    : {
        label: 'Ждёт в пункте выдачи',
        detail: 'Хранится 7 дней, для получения нужен код из СМС',
      },
  { label: 'Получен', detail: 'Отсчёт 30 дней на возврат начался' },
]

/** Days after the order was placed when each step is expected, for steps not reached yet. */
const EXPECTED_OFFSETS: Record<ShippingMethod, number[]> = {
  courier: [0, 0, 1, 2, 2],
  pickup: [0, 0, 1, 3, 3],
}

const STEP_OF: Partial<Record<OrderStatus, number>> = {
  CONFIRMED: 0,
  ASSEMBLED: 1,
  SHIPPED: 2,
  OUT_FOR_DELIVERY: 3,
  READY_FOR_PICKUP: 3,
  DELIVERED: 4,
}

type TrackingInput = {
  number: string
  status: OrderStatus
  shippingMethod: ShippingMethod
  createdAt: Date
  deliveryTo: Date
  events: { status: OrderStatus; createdAt: Date }[]
}

/**
 * Timeline for the tracking page: reached steps carry the real date of their status change,
 * the rest an expected date (the last one, the promised delivery date).
 */
export function buildTracking(order: TrackingInput): Tracking {
  const steps = stepsFor(order.shippingMethod)
  const offsets = EXPECTED_OFFSETS[order.shippingMethod]
  const reachedAt = new Map<number, Date>()
  for (const e of order.events) {
    const step = STEP_OF[e.status]
    if (step !== undefined && !reachedAt.has(step)) reachedAt.set(step, e.createdAt)
  }
  // Highest step ever reached (a cancelled order keeps its progress for context).
  const current = Math.max(-1, ...reachedAt.keys())

  return {
    number: order.number,
    method: order.shippingMethod,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status],
    cancelled: order.status === 'CANCELLED',
    current,
    steps: steps.map((s, i) => {
      const expected =
        i === steps.length - 1
          ? order.deliveryTo
          : new Date(order.createdAt.getTime() + (offsets[i] ?? 0) * 86_400_000)
      return {
        label: s.label,
        detail: s.detail,
        date: (reachedAt.get(i) ?? expected).toISOString(),
        done: i <= current,
      }
    }),
  }
}
