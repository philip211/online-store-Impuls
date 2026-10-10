import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import type { Order, OrderStatus, Page } from '@/entities/order'
import type { Product } from '@/entities/product'
import type { Role, User } from '@/entities/session'
import { api } from '@/shared/api'

/* Shapes of the admin API (server/src/modules/admin). */

/** A photo as stored: from the media pipeline (`n`) or uploaded here (`path`). */
export type AdminPhoto = {
  n?: number
  path?: string
  role: 'primary' | 'gallery' | 'context'
  color: string
  alt: string
  focal: string
  tone: 'light' | 'mid' | 'dark'
  credit?: { author: string; authorUrl: string; sourceUrl: string; id: string }
  width: number
  height: number
  widths: number[]
  placeholder: string
  dominant: string
  /** Preview URL; never sent back. */
  src: string
}

/** What POST /admin/media returns for one uploaded file. */
export type UploadedPhoto = Pick<
  AdminPhoto,
  'width' | 'height' | 'widths' | 'placeholder' | 'dominant' | 'tone' | 'src'
> & { path: string }

export type AdminProduct = Product & {
  categoryName: string
  photos: AdminPhoto[]
  stock: number
  isActive: boolean
  featuredRank: number | null
  createdAt: string
  updatedAt: string
}

export type OrderEvent = {
  status: OrderStatus
  comment: string | null
  actorId: string | null
  createdAt: string
}

export type AdminPayment = {
  id: string
  provider: string
  providerPaymentId: string
  status: string
  amount: number
  paidAt: string | null
  createdAt: string
}

export type AdminOrder = Order & {
  id: string
  userId: string | null
  noReceipt: boolean
  nextStatuses: OrderStatus[]
  events: OrderEvent[]
  payments: AdminPayment[]
}

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED'
export type AdminReview = {
  id: string
  productId: number
  productName: string
  author: string
  rating: number
  text: string
  status: ReviewStatus
  verified: boolean
  helpful: number
  createdAt: string
}

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type AdminReturn = {
  id: string
  ref: string
  orderNumber: string
  reason: string
  status: ReturnStatus
  comment: string | null
  createdAt: string
}

export type Stats = {
  ordersToday: number
  revenue30d: number
  orders30d: number
  byStatus: Partial<Record<OrderStatus, number>>
  pendingReviews: number
  openReturns: number
  lowStock: { id: number; name: string; stock: number }[]
}

export type AuditEntry = {
  id: number
  actorId: string | null
  actorEmail: string | null
  action: string
  entity: string
  entityId: string
  data: unknown
  createdAt: string
}

export type AdminCategory = {
  id: string
  name: string
  sortOrder: number
  coverProductId: number | null
  _count: { products: number }
}

type Query = Record<string, string | number | boolean | undefined>

/** Lists keep the previous page on screen while the next one loads: no skeleton flashes. */
const list = <T>(key: string, path: string, query: Query) =>
  queryOptions({
    queryKey: ['admin', key, query],
    queryFn: ({ signal }) => api<Page<T>>(path, { query, signal }),
    placeholderData: keepPreviousData,
  })

/** Everything is keyed under ['admin'], so signing out drops it in one go. */
export const adminQueries = {
  stats: () =>
    queryOptions({
      queryKey: ['admin', 'stats'],
      queryFn: ({ signal }) => api<Stats>('/admin/stats', { signal }),
      refetchOnWindowFocus: true,
    }),
  orders: (q: Query) => list<Order>('orders', '/admin/orders', q),
  order: (number: string) =>
    queryOptions({
      queryKey: ['admin', 'order', number],
      queryFn: ({ signal }) =>
        api<AdminOrder>(`/admin/orders/${encodeURIComponent(number)}`, { signal }),
    }),
  products: (q: Query) => list<AdminProduct>('products', '/admin/products', q),
  product: (id: number) =>
    queryOptions({
      queryKey: ['admin', 'product', id],
      queryFn: ({ signal }) => api<AdminProduct>(`/admin/products/${id}`, { signal }),
    }),
  categories: () =>
    queryOptions({
      queryKey: ['admin', 'categories'],
      queryFn: ({ signal }) => api<AdminCategory[]>('/admin/categories', { signal }),
      staleTime: Infinity,
    }),
  reviews: (q: Query) => list<AdminReview>('reviews', '/admin/reviews', q),
  returns: (q: Query) => list<AdminReturn>('returns', '/admin/returns', q),
  users: (q: Query) => list<User>('users', '/admin/users', q),
  audit: (q: Query) => list<AuditEntry>('audit', '/admin/audit-log', q),
}

export const adminApi = {
  changeOrderStatus: (number: string, body: { status: OrderStatus; comment?: string }) =>
    api<AdminOrder>(`/admin/orders/${encodeURIComponent(number)}/status`, {
      method: 'PATCH',
      body,
    }),
  createProduct: (body: ProductInput) =>
    api<AdminProduct>('/admin/products', { method: 'POST', body }),
  updateProduct: (id: number, body: Partial<ProductInput>) =>
    api<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body }),
  uploadPhoto: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return api<UploadedPhoto>('/admin/media', { method: 'POST', body })
  },
  setStock: (id: number, body: { stock?: number; delta?: number }) =>
    api<AdminProduct>(`/admin/products/${id}/stock`, { method: 'PATCH', body }),
  deactivateProduct: (id: number) => api<undefined>(`/admin/products/${id}`, { method: 'DELETE' }),
  moderateReview: (id: string, status: 'PUBLISHED' | 'REJECTED') =>
    api(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }),
  updateReturn: (id: string, body: { status: ReturnStatus; comment?: string }) =>
    api(`/admin/returns/${id}`, { method: 'PATCH', body }),
  changeRole: (id: string, role: Role) =>
    api<User>(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
}

/** Everything the product editor sends (POST creates, PATCH replaces these fields). */
export type ProductInput = {
  slug: string
  categoryId: string
  kind: string
  name: string
  brand: string
  price: number
  oldPrice: number | null
  stock: number
  colors: { name: string; hex: string }[]
  optionLabel: string
  options: string[]
  description: string
  specs: { label: string; value: string }[]
  popularity: number
  tags: string[]
  dimensions: { size: string; weight: string; compare: string }
  featuredRank: number | null
  isActive: boolean
  images: Omit<AdminPhoto, 'src'>[]
}
