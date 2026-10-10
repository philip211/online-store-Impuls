import { COURIER_PRICE, FREE_SHIPPING_FROM } from '@/shared/config'

import type { ShippingMethod } from './schema'

export function shippingCost(method: ShippingMethod, subtotal: number): number {
  if (method === 'pickup' || subtotal >= FREE_SHIPPING_FROM) return 0
  return COURIER_PRICE
}

export function orderTotals(method: ShippingMethod, subtotal: number) {
  const shipping = shippingCost(method, subtotal)
  return { subtotal, shipping, total: subtotal + shipping }
}

export type OrderTotals = ReturnType<typeof orderTotals>
