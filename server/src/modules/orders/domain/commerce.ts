import type { ShippingMethod } from '../../../../generated/prisma/client'

/** Same numbers the storefront shows; the server is the source of truth for the charge. */
export const FREE_SHIPPING_FROM = 20_000
export const COURIER_PRICE = 390
/** Voluntary return window, days from delivery. */
export const RETURN_DAYS = 30
/** Most units of one item per order; matches the storefront cart. */
export const MAX_QTY_PER_LINE = 99

export function shippingCost(method: ShippingMethod, subtotal: number): number {
  if (method === 'pickup' || subtotal >= FREE_SHIPPING_FROM) return 0
  return COURIER_PRICE
}

export function orderTotals(method: ShippingMethod, subtotal: number) {
  const shipping = shippingCost(method, subtotal)
  return { subtotal, shipping, total: subtotal + shipping }
}
