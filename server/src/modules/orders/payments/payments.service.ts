import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import type { Order, OrderItem, Payment } from '../../../../generated/prisma/client'
import { Env, NodeEnv } from '../../../config/env'
import { PrismaService } from '../../../prisma/prisma.service'
import { OrderLifecycleService } from '../order-lifecycle.service'
import {
  type GatewayPayment,
  PAYMENT_GATEWAY,
  type PaymentGateway,
  type ReceiptData,
} from './gateway'

/** How long past the deadline an unpaid order waits for an unreachable provider. */
const GIVE_UP_AFTER_MS = 30 * 60_000

type OrderForPayment = Order & { items: OrderItem[] }

/**
 * Card payments. The provider is the source of truth: webhooks, the return from the payment
 * page and the expiry job all end in `sync()`, which re-reads the payment from the provider
 * and applies it idempotently, so duplicates and races are harmless.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private refunding = false
  private expiring = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly env: Env,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** Opens a new payment for an unpaid order. Retrying with the same attempt number is safe. */
  async createForOrder(order: OrderForPayment): Promise<Payment> {
    const attempt = (await this.prisma.payment.count({ where: { orderId: order.id } })) + 1
    const idempotenceKey = `${order.id}:${attempt}`
    const remote = await this.gateway.create({
      amount: order.total,
      description: `Заказ ${order.number} в магазине «Импульс»`,
      returnUrl: `${this.env.FRONTEND_URL[0]}/order/success?order=${order.number}`,
      idempotenceKey,
      metadata: { orderId: order.id, orderNumber: order.number },
      receipt: this.receipt(order),
    })
    return this.prisma.payment.upsert({
      where: { idempotenceKey },
      create: {
        orderId: order.id,
        provider: this.gateway.provider,
        providerPaymentId: remote.id,
        status: remote.status,
        amount: remote.amount,
        confirmationUrl: remote.confirmationUrl,
        idempotenceKey,
      },
      update: {},
    })
  }

  /** Pulls the payment's state from the provider and applies it. Unknown ids are ignored. */
  async sync(providerPaymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { providerPaymentId } })
    if (!payment) {
      this.logger.warn(`Sync for unknown payment ${providerPaymentId}`)
      return
    }
    await this.apply(payment, await this.gateway.get(providerPaymentId))
  }

  /** Re-checks every open payment of an order, e.g. when the shopper returns from paying. */
  async syncOrder(orderId: string): Promise<void> {
    const open = await this.prisma.payment.findMany({
      where: { orderId, status: { in: ['PENDING', 'WAITING_FOR_CAPTURE'] } },
    })
    for (const p of open) await this.apply(p, await this.gateway.get(p.providerPaymentId))
  }

  /** Refunds a captured payment of a cancelled order. */
  /**
   * Sends back the money of an order's payments marked REFUND_PENDING (set in the same
   * transaction that cancelled the order). Best effort: what fails stays pending and the
   * retry job tries again with the same idempotence key, so nobody is refunded twice.
   */
  async refundOrder(orderId: string): Promise<void> {
    const pending = await this.prisma.payment.findMany({
      where: { orderId, status: 'REFUND_PENDING' },
    })
    for (const p of pending) await this.refundOne(p)
  }

  /** Retries refunds the provider could not take the first time. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryRefunds(): Promise<number> {
    if (this.env.NODE_ENV === NodeEnv.Test || this.refunding) return 0
    this.refunding = true
    try {
      return await this.retryRefundsNow()
    } finally {
      this.refunding = false
    }
  }

  async retryRefundsNow(): Promise<number> {
    const pending = await this.prisma.payment.findMany({
      where: { status: 'REFUND_PENDING' },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    })
    let done = 0
    for (const p of pending) if (await this.refundOne(p)) done++
    return done
  }

  private async refundOne(p: Payment): Promise<boolean> {
    try {
      await this.gateway.refund(p.providerPaymentId, p.amount, `refund:${p.id}`)
      await this.prisma.payment.updateMany({
        where: { id: p.id, status: 'REFUND_PENDING' },
        data: { status: 'REFUNDED' },
      })
      this.logger.log(`Refunded ${p.amount} ₽ for payment ${p.id}`)
      return true
    } catch (err) {
      // Touch updatedAt so the retry queue moves on to the next payment.
      await this.prisma.payment.update({
        where: { id: p.id },
        data: { cancellationReason: p.cancellationReason },
      })
      this.logger.error({ err }, `Refund of payment ${p.id} failed, will retry`)
      return false
    }
  }

  /** Releases the stock of orders not paid in time. */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnpaid(): Promise<number> {
    // A slow provider can make a run longer than a minute: never two at once.
    if (this.env.NODE_ENV === NodeEnv.Test || this.expiring) return 0
    this.expiring = true
    try {
      return await this.expireUnpaidNow()
    } finally {
      this.expiring = false
    }
  }

  async expireUnpaidNow(now = new Date()): Promise<number> {
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', paymentExpiresAt: { lt: now } },
      select: { id: true, number: true, paymentExpiresAt: true },
      orderBy: { paymentExpiresAt: 'asc' },
      take: 50,
    })
    let expired = 0
    for (const order of stale) {
      try {
        // The shopper may have paid a second ago: check before cancelling.
        try {
          await this.syncOrder(order.id)
        } catch (err) {
          // The provider is not answering. Keep waiting a while, then release the stock anyway:
          // a payment that arrives later is refunded automatically (see apply).
          const overdue = now.getTime() - (order.paymentExpiresAt?.getTime() ?? 0)
          if (overdue < GIVE_UP_AFTER_MS) throw err
          this.logger.warn(
            `Order ${order.number}: provider unavailable, cancelling without a final check`,
          )
        }
        const fresh = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id } })
        if (fresh.status !== 'PENDING_PAYMENT') continue

        const open = await this.prisma.payment.findMany({
          where: { orderId: order.id, status: 'PENDING' },
        })
        for (const p of open) {
          const remote = await this.gateway
            .cancel(p.providerPaymentId, `cancel:${p.id}`)
            .catch(() => null)
          if (remote) await this.apply(p, remote)
        }
        await this.lifecycle.transition(order.id, 'CANCELLED', { comment: 'Не оплачен вовремя' })
        expired++
      } catch (err) {
        this.logger.error({ err }, `Failed to expire order ${order.number}`)
      }
    }
    return expired
  }

  private async apply(payment: Payment, remote: GatewayPayment) {
    let refund = false
    await this.prisma.$transaction(async (tx) => {
      // Serialises concurrent syncs of one order (webhook + return page + expiry job).
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId}::uuid FOR UPDATE`
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })
      // Our own refund states outrank the provider's 'succeeded'.
      if (
        current.status === remote.status ||
        current.status === 'REFUNDED' ||
        current.status === 'REFUND_PENDING'
      ) {
        return
      }
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })
      // Paid after the reservation expired (or the order was cancelled): give the money back.
      const lateForCancelled = remote.status === 'SUCCEEDED' && order.status === 'CANCELLED'

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: lateForCancelled ? 'REFUND_PENDING' : remote.status,
          confirmationUrl: remote.confirmationUrl,
          cancellationReason: remote.cancellationReason,
          ...(remote.status === 'SUCCEEDED' ? { paidAt: new Date() } : {}),
        },
      })
      if (remote.status !== 'SUCCEEDED') return

      if (remote.amount !== order.total) {
        this.logger.error(
          `Payment ${payment.id}: paid ${remote.amount} ₽, order total ${order.total} ₽`,
        )
      }
      if (order.status === 'PENDING_PAYMENT') {
        await this.lifecycle.transitionInTx(tx, order.id, 'CONFIRMED', {
          comment: 'Оплачен картой',
        })
      } else if (lateForCancelled) {
        refund = true
      }
    })
    if (refund) {
      this.logger.warn(`Order ${payment.orderId} was paid after cancellation, refunding`)
      await this.refundOrder(payment.orderId)
    }
  }

  private receipt(order: OrderForPayment): ReceiptData {
    const items: ReceiptData['items'] = order.items.map((i) => ({
      description: `${i.productName}, ${i.colorName}`,
      quantity: i.qty,
      unitPrice: i.unitPrice,
      kind: 'commodity',
    }))
    if (order.shippingCost > 0) {
      items.push({
        description: 'Доставка курьером',
        quantity: 1,
        unitPrice: order.shippingCost,
        kind: 'service',
      })
    }
    return { customer: { phone: order.phone, email: order.email ?? undefined }, items }
  }
}
