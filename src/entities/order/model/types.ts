import type { DeliveryMethod } from '@/shared/lib'

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSEMBLED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED'

export type OrderItem = {
  productId: number
  slug: string
  name: string
  kind: string
  colorName: string
  option: string
  unitPrice: number
  qty: number
  lineTotal: number
  imageId: string | null
}

/** An order as the API returns it (GET /me/orders, /admin/orders). */
export type Order = {
  number: string
  status: OrderStatus
  statusLabel: string
  name: string
  phone: string
  email: string | null
  address: string
  addressExtra: string
  shipping: DeliveryMethod
  payment: 'card' | 'cash'
  gift: boolean
  giftMessage: string
  subtotal: number
  shippingCost: number
  total: number
  deliveryFrom: string
  deliveryTo: string
  createdAt: string
  items: OrderItem[]
  paymentInfo: {
    status: string
    confirmationUrl: string | null
    expiresAt: string | null
  } | null
}

export type TrackingStep = { label: string; detail: string; date: string; done: boolean }

export type Tracking = {
  status: OrderStatus
  cancelled: boolean
  steps: TrackingStep[]
  /** Latest completed step; -1 while the order waits for payment. */
  current: number
}

/** A paginated list from the API. */
export type Page<T> = {
  items: T[]
  meta: { page: number; limit: number; total: number; pages: number }
}
