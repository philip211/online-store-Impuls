import type { Order, OrderItem, Payment } from '../../../generated/prisma/client'
import { formatPhone } from '../../common/lib/phone'
import { STATUS_LABELS } from './domain/status'
import type { OrderDto } from './dto/order.dto'

export type OrderWithRelations = Order & { items: OrderItem[]; payments: Payment[] }

export const orderInclude = {
  items: { orderBy: { id: 'asc' } },
  payments: { orderBy: { createdAt: 'desc' } },
} as const

export function toOrderDto(o: OrderWithRelations): OrderDto {
  const payment = o.paymentMethod === 'card' ? (o.payments[0] ?? null) : null
  return {
    number: o.number,
    status: o.status,
    statusLabel: STATUS_LABELS[o.status],
    name: o.customerName,
    phone: formatPhone(o.phone),
    email: o.email,
    address: o.address,
    addressExtra: o.addressExtra,
    shipping: o.shippingMethod,
    payment: o.paymentMethod,
    gift: o.gift,
    giftMessage: o.giftMessage,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    deliveryFrom: o.deliveryFrom.toISOString(),
    deliveryTo: o.deliveryTo.toISOString(),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      productId: i.productId,
      slug: i.slug,
      name: i.productName,
      kind: i.kind,
      colorName: i.colorName,
      option: i.option,
      unitPrice: i.unitPrice,
      qty: i.qty,
      lineTotal: i.lineTotal,
      imageId: i.imageId,
    })),
    paymentInfo: payment
      ? {
          status: payment.status,
          confirmationUrl:
            o.status === 'PENDING_PAYMENT' && payment.status === 'PENDING'
              ? payment.confirmationUrl
              : null,
          expiresAt: o.paymentExpiresAt?.toISOString() ?? null,
        }
      : null,
  }
}
