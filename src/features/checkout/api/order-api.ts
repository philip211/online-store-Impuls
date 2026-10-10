import type { CartLine } from '@/entities/cart'
import { api, isApiError } from '@/shared/api'

import type { CheckoutValues, PaymentMethod, ShippingMethod } from '../model/schema'

export type PlaceOrderRequest = {
  customer: CheckoutValues
  lines: Pick<CartLine, 'productId' | 'colorName' | 'option' | 'qty' | 'price'>[]
  total: number
}

/** Plain, serialisable data: it travels to the success page in history state. */
export type PlacedOrder = {
  id: string
  name: string
  phone: string
  total: number
  shipping: ShippingMethod
  payment: PaymentMethod
  /** ISO dates of the promised delivery window. */
  deliveryFrom: string
  deliveryTo: string
  gift: boolean
  /** Card orders: the payment page to send the shopper to. */
  paymentUrl?: string | null
  /** Opens the order without an account (`X-Order-Key`), e.g. after paying. */
  accessKey?: string
}

/** The API's answer to POST /orders (fields this client uses). */
type OrderResponse = {
  number: string
  name: string
  phone: string
  total: number
  shipping: ShippingMethod
  payment: PaymentMethod
  deliveryFrom: string
  deliveryTo: string
  gift: boolean
  accessKey?: string
  status: string
  paymentInfo: { status: string; confirmationUrl: string | null } | null
}

const toPlaced = (o: OrderResponse): PlacedOrder => ({
  id: o.number,
  name: o.name,
  phone: o.phone,
  total: o.total,
  shipping: o.shipping,
  payment: o.payment,
  deliveryFrom: o.deliveryFrom,
  deliveryTo: o.deliveryTo,
  gift: o.gift,
  paymentUrl: o.paymentInfo?.confirmationUrl ?? null,
  accessKey: o.accessKey,
})

/**
 * One Idempotency-Key per distinct order: resending the same form (a retry after a lost
 * response, a double click) reuses it and the API returns the order it already created.
 */
let lastAttempt: { body: string; key: string } | null = null
function keyFor(body: string) {
  if (lastAttempt?.body !== body) lastAttempt = { body, key: crypto.randomUUID() }
  return lastAttempt.key
}

/** Human message for a failed checkout: the API explains stock and price problems itself. */
export function checkoutError(e: unknown): string {
  if (
    isApiError(e, 'PRICE_CHANGED') ||
    isApiError(e, 'OUT_OF_STOCK') ||
    isApiError(e, 'PRODUCT_UNAVAILABLE')
  ) {
    return e.detail
  }
  return 'Не получилось отправить заказ. Попробуйте ещё раз.'
}

/** POST /orders. The server prices the order; `total` only guards against stale prices. */
export async function placeOrder(req: PlaceOrderRequest): Promise<PlacedOrder> {
  const body = {
    customer: { ...req.customer, name: req.customer.name.trim() },
    lines: req.lines,
    total: req.total,
  }
  const json = JSON.stringify(body)
  const order = await api<OrderResponse>('/orders', {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': keyFor(json) },
  })
  lastAttempt = null
  return toPlaced(order)
}

/** The order as it is now: after paying, the status says whether the payment went through. */
export async function fetchOrder(number: string, accessKey: string) {
  return api<OrderResponse>(`/orders/${encodeURIComponent(number)}`, {
    headers: { 'X-Order-Key': accessKey },
  })
}

const PENDING_KEY = 'impulse-pending-order'

/** Card orders leave the site to pay: the success page picks the order up from here. */
export function stashPlacedOrder(order: PlacedOrder) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(order))
  } catch {
    // Private mode: the success page falls back to the order number in the URL.
  }
}

export function takeStashedOrder(number: string): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    const order: unknown = raw ? JSON.parse(raw) : null
    return isPlacedOrder(order) && order.id === number ? order : null
  } catch {
    return null
  }
}

const isText = (v: unknown): v is string => typeof v === 'string'

/** History state is untyped and may come from an older build: check before rendering. */
export function isPlacedOrder(v: unknown): v is PlacedOrder {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    isText(o.id) &&
    isText(o.name) &&
    isText(o.phone) &&
    typeof o.total === 'number' &&
    (o.shipping === 'courier' || o.shipping === 'pickup') &&
    (o.payment === 'card' || o.payment === 'cash') &&
    isText(o.deliveryFrom) &&
    isText(o.deliveryTo) &&
    !Number.isNaN(Date.parse(o.deliveryFrom)) &&
    !Number.isNaN(Date.parse(o.deliveryTo)) &&
    typeof o.gift === 'boolean'
  )
}
