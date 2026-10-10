import { Injectable } from '@nestjs/common'

import { notFound } from '../../common/errors'
import { randomToken } from '../../common/lib/crypto'
import { Env } from '../../config/env'
import { PrismaService, type Tx } from '../../prisma/prisma.service'
import { OutboxService } from '../notifications/outbox.service'

@Injectable()
export class RestockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly env: Env,
  ) {}

  /** Repeated requests for the same product and address are a no-op. */
  async subscribe(productId: number, email: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    })
    if (!product) throw notFound('Товар не найден')
    await this.prisma.restockSubscription.upsert({
      where: { productId_email: { productId, email } },
      create: { productId, email },
      // Asking again after an earlier alert re-arms it.
      update: { notifiedAt: null },
    })
    return { productId, email }
  }

  async unsubscribe(productId: number, email: string) {
    await this.prisma.restockSubscription.deleteMany({ where: { productId, email } })
  }

  /**
   * Queues "back in stock" emails for products that now have stock. Call inside the
   * transaction that raised the stock, so emails go out only if it commits.
   */
  async notifyBackInStock(productIds: readonly number[], tx: Tx) {
    if (!productIds.length) return
    const products = await tx.product.findMany({
      where: { id: { in: [...productIds] }, stock: { gt: 0 }, isActive: true },
      select: { id: true, name: true, slug: true },
    })
    const site = this.env.FRONTEND_URL[0]
    for (const p of products) {
      const subs = await tx.restockSubscription.findMany({
        where: { productId: p.id, notifiedAt: null },
        select: { id: true, email: true },
      })
      if (!subs.length) continue
      await this.outbox.enqueueMany(
        subs.map((s) => ({
          type: 'restock.available' as const,
          to: s.email,
          productName: p.name,
          productUrl: `${site}/product/${p.slug}`,
        })),
        tx,
      )
      await tx.restockSubscription.updateMany({
        where: { id: { in: subs.map((s) => s.id) } },
        data: { notifiedAt: new Date() },
      })
    }
  }
}

/** Newsletter with double opt-in: nothing is sent until the address owner confirms. */
@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly env: Env,
  ) {}

  /**
   * Always answers the same way, whether the address is new, pending or already confirmed,
   * so the endpoint cannot be used to learn who is subscribed.
   */
  async subscribe(email: string) {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.newsletterSubscription.findUnique({ where: { email } })
      if (existing?.status === 'CONFIRMED') return
      const sub = existing
        ? await tx.newsletterSubscription.update({
            where: { email },
            data: { status: 'PENDING', unsubscribedAt: null },
          })
        : await tx.newsletterSubscription.create({ data: { email, token: randomToken() } })
      const api = `${this.env.PUBLIC_API_URL}/api/v1/newsletter`
      await this.outbox.enqueue(
        {
          type: 'newsletter.confirm',
          to: email,
          confirmUrl: `${api}/confirm?token=${sub.token}`,
          unsubscribeUrl: `${api}/unsubscribe?token=${sub.token}`,
        },
        tx,
      )
    })
    return { email }
  }

  /** Returns false for an unknown token. */
  async confirm(token: string): Promise<boolean> {
    const { count } = await this.prisma.newsletterSubscription.updateMany({
      where: { token, status: { not: 'UNSUBSCRIBED' } },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    })
    return count > 0
  }

  async unsubscribe(token: string): Promise<boolean> {
    const { count } = await this.prisma.newsletterSubscription.updateMany({
      where: { token },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    })
    return count > 0
  }
}
