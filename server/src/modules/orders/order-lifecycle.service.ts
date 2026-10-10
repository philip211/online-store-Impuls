import { Injectable } from '@nestjs/common'

import type { Order, OrderItem, OrderStatus } from '../../../generated/prisma/client'
import { ErrorCode, notFound, unprocessable } from '../../common/errors'
import { Env } from '../../config/env'
import { PrismaService, type Tx } from '../../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CatalogService } from '../catalog/catalog.service'
import { OutboxService } from '../notifications/outbox.service'
import type { MailMessage } from '../notifications/templates'
import { RestockService } from '../subscriptions/subscriptions.service'
import { canTransition, holdsStock, STATUS_LABELS } from './domain/status'

/** What the order emails need. */
type MailOrder = Pick<
  Order,
  | 'number'
  | 'email'
  | 'status'
  | 'customerName'
  | 'total'
  | 'deliveryFrom'
  | 'deliveryTo'
  | 'shippingMethod'
> & { items: Pick<OrderItem, 'productName' | 'qty' | 'lineTotal'>[] }

export type TransitionOptions = {
  /** Staff member making the change; omitted for system changes (payment, expiry). */
  actorId?: string
  comment?: string
}

/**
 * The only place an order changes status. Each change is checked against the state machine,
 * recorded in the history, and has its side effects (stock, emails, audit) committed in the
 * same transaction under a row lock, so concurrent changes cannot interleave.
 */
@Injectable()
export class OrderLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly restock: RestockService,
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
    private readonly env: Env,
  ) {}

  async transition(orderId: string, to: OrderStatus, opts: TransitionOptions = {}) {
    let stockReturned = false
    const result = await this.prisma.$transaction(async (tx) => {
      const r = await this.transitionInTx(tx, orderId, to, opts)
      stockReturned = r.stockReturned
      return r
    })
    if (stockReturned) this.catalog.invalidate()
    return result
  }

  /** For callers that already hold a transaction (e.g. payment confirmation). */
  async transitionInTx(tx: Tx, orderId: string, to: OrderStatus, opts: TransitionOptions = {}) {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId}::uuid FOR UPDATE`
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) throw notFound('Заказ не найден')
    const from = order.status

    if (!canTransition(from, to, order.shippingMethod)) {
      throw unprocessable(
        ErrorCode.InvalidStatusTransition,
        `Нельзя перевести заказ из «${STATUS_LABELS[from]}» в «${STATUS_LABELS[to]}»`,
        { from, to },
      )
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: to, ...(from === 'PENDING_PAYMENT' ? { paymentExpiresAt: null } : {}) },
      include: { items: true },
    })
    await tx.orderStatusEvent.create({
      data: { orderId, status: to, comment: opts.comment, actorId: opts.actorId },
    })

    let stockReturned = false
    if (to === 'CANCELLED' && holdsStock(from)) {
      // One update per product, in id order: checkout locks product rows in the same order,
      // so a cancellation and a new order can never deadlock.
      const back = new Map<number, number>()
      for (const item of order.items)
        back.set(item.productId, (back.get(item.productId) ?? 0) + item.qty)
      for (const [productId, qty] of [...back].sort(([x], [y]) => x - y)) {
        await tx.product.update({ where: { id: productId }, data: { stock: { increment: qty } } })
      }
      await this.restock.notifyBackInStock([...new Set(order.items.map((i) => i.productId))], tx)
      stockReturned = true
    }

    // A captured card payment of a cancelled order is owed back. Marked here, in the same
    // transaction, so the refund cannot be forgotten if the provider call fails afterwards.
    if (to === 'CANCELLED') {
      await tx.payment.updateMany({
        where: { orderId, status: 'SUCCEEDED' },
        data: { status: 'REFUND_PENDING' },
      })
    }

    if (opts.actorId) {
      await this.audit.log(
        {
          actorId: opts.actorId,
          action: 'order.status',
          entity: 'Order',
          entityId: order.number,
          data: { from, to },
        },
        tx,
      )
    }

    const mail = this.mailFor(updated, from)
    if (mail) await this.outbox.enqueue(mail, tx)

    return { order: updated, from, stockReturned }
  }

  private mailFor(order: MailOrder, from: OrderStatus): MailMessage | null {
    if (!order.email) return null
    const orderUrl = `${this.env.FRONTEND_URL[0]}/help/order-status?order=${order.number}`
    // A paid card order gets the full confirmation, as a cash order does at checkout.
    if (from === 'PENDING_PAYMENT' && order.status === 'CONFIRMED')
      return this.placedMail(order, orderUrl)
    // Unpaid orders that time out are not worth an email: the shopper walked away.
    if (from === 'PENDING_PAYMENT') return null
    return {
      type: 'order.status',
      to: order.email,
      number: order.number,
      status: STATUS_LABELS[order.status],
      orderUrl,
    }
  }

  placedMail(
    order: MailOrder,
    orderUrl = `${this.env.FRONTEND_URL[0]}/help/order-status?order=${order.number}`,
  ): MailMessage | null {
    if (!order.email) return null
    return {
      type: 'order.placed',
      to: order.email,
      number: order.number,
      name: order.customerName,
      total: order.total,
      items: order.items.map((i) => ({ name: i.productName, qty: i.qty, lineTotal: i.lineTotal })),
      deliveryFrom: order.deliveryFrom.toISOString(),
      deliveryTo: order.deliveryTo.toISOString(),
      shipping: order.shippingMethod,
      orderUrl,
    }
  }
}
