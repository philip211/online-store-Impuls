import type { DeliveryMethod } from '@/shared/lib'

/** "IM-123456", "im 123456", "IM123456" or just "123456" → "IM-123456"; anything else → null. */
export function parseOrderNumber(input: string): string | null {
  const match = /^(?:IM-?)?(\d{6})$/i.exec(input.replace(/\s+/g, ''))
  return match ? `IM-${match[1]}` : null
}

export type OrderStep = { label: string; detail: string; date: Date; done: boolean }
export type OrderStatus = {
  number: string
  method: DeliveryMethod
  steps: OrderStep[]
  /** Index of the latest completed step. */
  current: number
}

/** Tracking as the API sends it: dates are ISO strings. */
export type OrderStatusResponse = Omit<OrderStatus, 'steps'> & {
  steps: (Omit<OrderStep, 'date'> & { date: string })[]
  cancelled?: boolean
}

export const toOrderStatus = (r: OrderStatusResponse): OrderStatus => ({
  number: r.number,
  method: r.method,
  current: r.current,
  steps: r.steps.map((step) => ({ ...step, date: new Date(step.date) })),
})
