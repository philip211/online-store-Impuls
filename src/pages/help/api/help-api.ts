import { api } from '@/shared/api'

import { toOrderStatus, type OrderStatus, type OrderStatusResponse } from '../lib/order-status'
import type { ReturnDraft } from '../lib/return-request'

/** Order status by number and the phone it was placed with. */
export async function trackOrder(input: { order: string; phone: string }): Promise<OrderStatus> {
  const res = await api<OrderStatusResponse>('/orders/track', { method: 'POST', body: input })
  return toOrderStatus(res)
}

/** Return request; the API checks the order was delivered within the return window. */
export function requestReturn(draft: ReturnDraft): Promise<{ ref: string; order: string }> {
  return api('/returns', { method: 'POST', body: draft })
}
