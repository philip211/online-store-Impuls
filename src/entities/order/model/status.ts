import type { OrderStatus } from './types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Ждёт оплаты',
  CONFIRMED: 'Оформлен',
  ASSEMBLED: 'Собран',
  SHIPPED: 'Передан в доставку',
  OUT_FOR_DELIVERY: 'У курьера',
  READY_FOR_PICKUP: 'В пункте выдачи',
  DELIVERED: 'Получен',
  CANCELLED: 'Отменён',
}

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

/** How a status reads at a glance: moving, done, stopped, or waiting on the buyer. */
export type StatusTone = 'active' | 'done' | 'stopped' | 'waiting'

export function statusTone(status: OrderStatus): StatusTone {
  if (status === 'DELIVERED') return 'done'
  if (status === 'CANCELLED') return 'stopped'
  if (status === 'PENDING_PAYMENT') return 'waiting'
  return 'active'
}

export const isOrderStatus = (v: unknown): v is OrderStatus =>
  typeof v === 'string' && v in ORDER_STATUS_LABELS
