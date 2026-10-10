import { Injectable, Logger } from '@nestjs/common'

import type { OrderStatus, Prisma, ReturnStatus } from '../../../generated/prisma/client'
import { page } from '../../common/dto/pagination.dto'
import { ErrorCode, notFound, unprocessable } from '../../common/errors'
import { PrismaService } from '../../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { nextStatuses } from '../orders/domain/status'
import { OrderLifecycleService } from '../orders/order-lifecycle.service'
import { orderInclude, toOrderDto } from '../orders/order.mapper'
import { PaymentsService } from '../orders/payments/payments.service'
import type {
  AdminOrderDto,
  AdminOrdersQueryDto,
  AdminReturnsQueryDto,
  AdminReviewsQueryDto,
  ChangeOrderStatusDto,
  ModerateReviewDto,
  StatsDto,
  UpdateReturnDto,
} from './dto/admin.dto'

const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  REJECTED: [],
  COMPLETED: [],
}

/** Orders, reviews, returns and the dashboard. */
@Injectable()
export class AdminSalesService {
  private readonly logger = new Logger(AdminSalesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  async orders(q: AdminOrdersQueryDto) {
    const digits = q.q?.replace(/\D/g, '') ?? ''
    const where: Prisma.OrderWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from) } : {}),
              ...(q.to ? { lte: new Date(q.to) } : {}),
            },
          }
        : {}),
      ...(q.q
        ? {
            OR: [
              { number: { contains: q.q.toUpperCase() } },
              { customerName: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q.toLowerCase() } },
              ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.order.count({ where }),
    ])
    return page(rows.map(toOrderDto), total, q)
  }

  async order(number: string): Promise<AdminOrderDto> {
    const o = await this.prisma.order.findUnique({
      where: { number },
      include: { ...orderInclude, events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!o) throw notFound('Заказ не найден')
    return {
      ...toOrderDto(o),
      id: o.id,
      userId: o.userId,
      noReceipt: o.noReceipt,
      nextStatuses: nextStatuses(o.status, o.shippingMethod),
      events: o.events.map((e) => ({
        status: e.status,
        comment: e.comment,
        actorId: e.actorId,
        createdAt: e.createdAt,
      })),
      payments: o.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        status: p.status,
        amount: p.amount,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
    }
  }

  /** Moves an order along; cancelling a paid order refunds the card payment. */
  async changeOrderStatus(actorId: string, number: string, dto: ChangeOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { number }, select: { id: true } })
    if (!order) throw notFound('Заказ не найден')
    await this.lifecycle.transition(order.id, dto.status, { actorId, comment: dto.comment })
    if (dto.status === 'CANCELLED') {
      await this.payments.refundOrder(order.id).catch((err: unknown) => {
        // The cancellation stands; the payment stays REFUND_PENDING and the retry job finishes it.
        this.logger.error({ err }, `Refund failed for ${number}`)
      })
    }
    return this.order(number)
  }

  async reviews(q: AdminReviewsQueryDto) {
    const where = q.status ? { status: q.status } : {}
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.review.count({ where }),
    ])
    const items = rows.map(({ product, userId: _, publishedAt: __, ...r }) => ({
      ...r,
      productName: product.name,
    }))
    return page(items, total, q)
  }

  async moderateReview(actorId: string, id: string, dto: ModerateReviewDto) {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({ where: { id } })
      if (!review) throw notFound('Отзыв не найден')
      const updated = await tx.review.update({
        where: { id },
        data: {
          status: dto.status,
          publishedAt: dto.status === 'PUBLISHED' ? (review.publishedAt ?? new Date()) : null,
        },
      })
      await this.audit.log(
        {
          actorId,
          action: 'review.moderate',
          entity: 'Review',
          entityId: id,
          data: { status: dto.status },
        },
        tx,
      )
      return { id: updated.id, status: updated.status }
    })
  }

  async returns(q: AdminReturnsQueryDto) {
    const where = q.status ? { status: q.status } : {}
    const [rows, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        include: { order: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ])
    const items = rows.map((r) => ({
      id: r.id,
      ref: r.ref,
      orderNumber: r.order.number,
      reason: r.reason,
      status: r.status,
      comment: r.comment,
      createdAt: r.createdAt,
    }))
    return page(items, total, q)
  }

  async updateReturn(actorId: string, id: string, dto: UpdateReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.returnRequest.findUnique({ where: { id } })
      if (!r) throw notFound('Заявка не найдена')
      if (!RETURN_TRANSITIONS[r.status].includes(dto.status)) {
        throw unprocessable(
          ErrorCode.InvalidStatusTransition,
          `Нельзя перевести заявку из ${r.status} в ${dto.status}`,
        )
      }
      const updated = await tx.returnRequest.update({
        where: { id },
        data: { status: dto.status, comment: dto.comment ?? r.comment },
      })
      await this.audit.log(
        {
          actorId,
          action: 'return.status',
          entity: 'ReturnRequest',
          entityId: r.ref,
          data: { from: r.status, to: dto.status },
        },
        tx,
      )
      return { id: updated.id, ref: updated.ref, status: updated.status }
    })
  }

  async stats(now = new Date()): Promise<StatsDto> {
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const monthAgo = new Date(now.getTime() - 30 * 86_400_000)
    const counted: OrderStatus[] = [
      'CONFIRMED',
      'ASSEMBLED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'READY_FOR_PICKUP',
      'DELIVERED',
    ]

    const [ordersToday, month, byStatus, pendingReviews, openReturns, lowStock] = await Promise.all(
      [
        this.prisma.order.count({ where: { createdAt: { gte: dayStart } } }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: monthAgo }, status: { in: counted } },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.order.groupBy({ by: ['status'], _count: true }),
        this.prisma.review.count({ where: { status: 'PENDING' } }),
        this.prisma.returnRequest.count({ where: { status: { in: ['REQUESTED', 'APPROVED'] } } }),
        this.prisma.product.findMany({
          where: { isActive: true, stock: { lte: 3 } },
          select: { id: true, name: true, stock: true },
          orderBy: { stock: 'asc' },
          take: 20,
        }),
      ],
    )
    return {
      ordersToday,
      revenue30d: month._sum.total ?? 0,
      orders30d: month._count,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      pendingReviews,
      openReturns,
      lowStock,
    }
  }
}
