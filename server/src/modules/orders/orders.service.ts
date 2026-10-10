import { HttpStatus, Injectable, Logger } from '@nestjs/common'

import { Prisma } from '../../../generated/prisma/client'
import {
  AppException,
  conflict,
  ErrorCode,
  type FieldError,
  unprocessable,
  ValidationException,
} from '../../common/errors'
import { hmac, safeEqual, sha256, stableStringify } from '../../common/lib/crypto'
import { normalizePhone } from '../../common/lib/phone'
import { Env } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import { CatalogService } from '../catalog/catalog.service'
import { getImage } from '../catalog/domain/images'
import { normalizeMediaBase, productInclude, toProduct } from '../catalog/domain/product.mapper'
import { OutboxService } from '../notifications/outbox.service'
import { MAX_QTY_PER_LINE, orderTotals } from './domain/commerce'
import { estimateDelivery } from './domain/delivery'
import { generateOrderNumber, parseOrderNumber } from './domain/order-number'
import { buildTracking, type Tracking } from './domain/status'
import type { OrderDto, PlacedOrderDto, PlaceOrderDto, TrackOrderDto } from './dto/order.dto'
import { OrderLifecycleService } from './order-lifecycle.service'
import { orderInclude, type OrderWithRelations, toOrderDto } from './order.mapper'
import { PaymentsService } from './payments/payments.service'

const orderNotFound = () =>
  new AppException(
    HttpStatus.NOT_FOUND,
    ErrorCode.OrderNotFound,
    'Заказ не найден. Проверьте номер и телефон',
  )

type PricedLine = {
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

const MAX_NUMBER_ATTEMPTS = 5

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly lifecycle: OrderLifecycleService,
    private readonly payments: PaymentsService,
    private readonly outbox: OutboxService,
    private readonly env: Env,
  ) {}

  /**
   * Places an order. Prices, shipping and the total are computed here from the database; the
   * client's numbers are only compared, never trusted. Stock is reserved atomically: two
   * shoppers racing for the last unit cannot both get it.
   *
   * Idempotent by `Idempotency-Key`: a retried request (lost response, double click) returns
   * the order created the first time instead of a second order.
   */
  async place(
    dto: PlaceOrderDto,
    idempotencyKey: string,
    userId?: string,
  ): Promise<PlacedOrderDto> {
    const requestHash = sha256(stableStringify({ dto, userId: userId ?? null }))
    const replay = await this.replay(idempotencyKey, requestHash)
    if (replay) return replay

    const c = dto.customer
    const phone = normalizePhone(c.phone)
    const errors: FieldError[] = []
    if (!phone) errors.push({ field: 'customer.phone', message: 'Нужен номер из 11 цифр' })
    if (errors.length) throw new ValidationException(errors)

    const lines = await this.priceLines(dto)
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const totals = orderTotals(c.shipping, subtotal)
    if (dto.total !== undefined && dto.total !== totals.total) {
      throw conflict(
        ErrorCode.PriceChanged,
        'Цены изменились. Проверьте корзину и подтвердите заказ ещё раз',
        {
          lines: lines.map((l) => ({
            productId: l.productId,
            colorName: l.colorName,
            option: l.option,
            price: l.unitPrice,
          })),
          ...totals,
        },
      )
    }

    const now = new Date()
    const delivery = estimateDelivery(c.shipping, this.env.SHOP_TIMEZONE, now)
    const status = c.payment === 'card' ? 'PENDING_PAYMENT' : 'CONFIRMED'

    let order: OrderWithRelations
    let soldOut = false
    try {
      order = await this.createWithUniqueNumber(async (number) =>
        this.prisma.$transaction(async (tx) => {
          soldOut = false
          for (const [productId, qty] of this.qtyByProduct(lines)) {
            const { count } = await tx.product.updateMany({
              where: { id: productId, isActive: true, stock: { gte: qty } },
              data: { stock: { decrement: qty } },
            })
            if (count === 0) {
              const left = await tx.product.findUnique({
                where: { id: productId },
                select: { stock: true, name: true },
              })
              throw conflict(
                ErrorCode.OutOfStock,
                `«${left?.name ?? 'Товар'}» закончился или осталось меньше, чем в корзине`,
                {
                  productId,
                  available: Math.max(0, left?.stock ?? 0),
                },
              )
            }
            const after = await tx.product.findUniqueOrThrow({
              where: { id: productId },
              select: { stock: true },
            })
            if (after.stock === 0) soldOut = true
          }

          const created = await tx.order.create({
            data: {
              number,
              userId,
              status,
              customerName: c.name,
              phone: phone as string,
              email: c.email ?? null,
              address: c.address,
              addressExtra: c.addressExtra,
              shippingMethod: c.shipping,
              paymentMethod: c.payment,
              gift: c.gift,
              giftMessage: c.gift ? c.giftMessage : '',
              noReceipt: c.noReceipt,
              subtotal: totals.subtotal,
              shippingCost: totals.shipping,
              total: totals.total,
              deliveryFrom: delivery.from,
              deliveryTo: delivery.to,
              paymentExpiresAt:
                status === 'PENDING_PAYMENT'
                  ? new Date(now.getTime() + this.env.PAYMENT_TIMEOUT_MINUTES * 60_000)
                  : null,
              idempotencyKey,
              requestHash,
              items: {
                create: lines.map((l) => ({
                  productId: l.productId,
                  productName: l.name,
                  slug: l.slug,
                  kind: l.kind,
                  colorName: l.colorName,
                  option: l.option,
                  unitPrice: l.unitPrice,
                  qty: l.qty,
                  lineTotal: l.lineTotal,
                  imageId: l.imageId,
                })),
              },
              events: { create: { status } },
            },
            include: orderInclude,
          })
          if (status === 'CONFIRMED') {
            const mail = this.lifecycle.placedMail(created)
            if (mail) await this.outbox.enqueue(mail, tx)
          }
          return created
        }),
      )
    } catch (err) {
      // A parallel request with the same key won the race: answer with its order.
      if (this.isUniqueViolation(err, 'idempotencyKey')) {
        const winner = await this.replay(idempotencyKey, requestHash)
        if (winner) return winner
      }
      throw err
    }

    // After commit, so the reload sees the new stock.
    if (soldOut) this.catalog.invalidate()

    if (order.paymentMethod === 'card') {
      try {
        const payment = await this.payments.createForOrder(order)
        order = { ...order, payments: [payment] }
      } catch (err) {
        // The order and reservation stand; the shopper can retry via POST /orders/:number/payment.
        this.logger.error({ err }, `Payment creation failed for ${order.number}`)
      }
    }
    return { ...toOrderDto(order), accessKey: this.accessKey(order.id) }
  }

  /** Order by number for its owner: the account it was placed from, or the access key holder. */
  async getForGuest(
    number: string,
    accessKey: string | undefined,
    userId?: string,
  ): Promise<OrderDto> {
    const order = await this.findAuthorized(number, accessKey, userId)
    // Returning from the payment page: confirm the outcome with the provider right away
    // rather than waiting for the webhook.
    if (order.status === 'PENDING_PAYMENT') {
      await this.payments
        .syncOrder(order.id)
        .catch((err: unknown) => this.logger.warn({ err }, 'Payment sync failed'))
      return toOrderDto(
        await this.prisma.order.findUniqueOrThrow({
          where: { id: order.id },
          include: orderInclude,
        }),
      )
    }
    return toOrderDto(order)
  }

  /** New payment link for an unpaid order (the first one expired or failed to open). */
  async retryPayment(
    number: string,
    accessKey: string | undefined,
    userId?: string,
  ): Promise<OrderDto> {
    let order = await this.findAuthorized(number, accessKey, userId)
    if (order.status !== 'PENDING_PAYMENT') {
      throw unprocessable(ErrorCode.PaymentFailed, 'Заказ не ждёт оплаты')
    }
    await this.payments.syncOrder(order.id)
    order = await this.prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderInclude,
    })
    if (order.status !== 'PENDING_PAYMENT') return toOrderDto(order)
    const open = order.payments.find((p) => p.status === 'PENDING' && p.confirmationUrl)
    if (!open) {
      const payment = await this.payments.createForOrder(order)
      order = { ...order, payments: [payment, ...order.payments] }
    }
    return toOrderDto(order)
  }

  /**
   * Public tracking by number + phone. Unknown number and wrong phone give the same answer,
   * so the endpoint does not confirm which order numbers exist.
   */
  async track(dto: TrackOrderDto): Promise<Tracking> {
    const number = parseOrderNumber(dto.order)
    const phone = normalizePhone(dto.phone)
    if (!number || !phone) throw orderNotFound()
    const order = await this.prisma.order.findUnique({
      where: { number },
      include: {
        events: { orderBy: { createdAt: 'asc' }, select: { status: true, createdAt: true } },
      },
    })
    if (!order || !safeEqual(order.phone, phone)) throw orderNotFound()
    return buildTracking(order)
  }

  private async findAuthorized(number: string, accessKey: string | undefined, userId?: string) {
    const order = await this.prisma.order.findUnique({ where: { number }, include: orderInclude })
    const ownsByAccount = order && userId && order.userId === userId
    const ownsByKey = order && accessKey && safeEqual(this.accessKey(order.id), accessKey)
    if (!order || !(ownsByAccount || ownsByKey)) throw orderNotFound()
    return order
  }

  private async replay(
    idempotencyKey: string,
    requestHash: string,
  ): Promise<PlacedOrderDto | null> {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: orderInclude,
    })
    if (!existing) return null
    if (existing.requestHash !== requestHash) {
      throw unprocessable(
        ErrorCode.IdempotencyMismatch,
        'Этот Idempotency-Key уже использован для другого заказа',
      )
    }
    return { ...toOrderDto(existing), accessKey: this.accessKey(existing.id) }
  }

  /**
   * Guest access secret for an order: an HMAC of its id, so it is never stored and a replayed
   * checkout returns the same key. Rotating JWT_ACCESS_SECRET invalidates old keys.
   */
  private accessKey(orderId: string) {
    return hmac(this.env.JWT_ACCESS_SECRET, `order-access:${orderId}`)
  }

  /** Validates lines against the catalogue and prices them from the database. */
  private async priceLines(dto: PlaceOrderDto): Promise<PricedLine[]> {
    const ids = [...new Set(dto.lines.map((l) => l.productId))]
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: productInclude,
    })
    const mediaBase = normalizeMediaBase(this.env.MEDIA_BASE_URL)
    const products = new Map(
      rows.map((r) => [
        r.id,
        { row: r, product: toProduct(r, mediaBase, normalizeMediaBase(this.env.UPLOADS_BASE_URL)) },
      ]),
    )

    const unavailable = ids.filter((id) => !products.get(id)?.row.isActive)
    if (unavailable.length) {
      throw conflict(
        ErrorCode.ProductUnavailable,
        'Часть товаров больше не продаётся. Уберите их из корзины',
        {
          productIds: unavailable,
        },
      )
    }

    const errors: FieldError[] = []
    const merged = new Map<string, PricedLine>()
    for (const [i, line] of dto.lines.entries()) {
      const { product } = products.get(line.productId) as NonNullable<
        ReturnType<typeof products.get>
      >
      if (!product.colors.some((c) => c.name === line.colorName)) {
        errors.push({ field: `lines.${i}.colorName`, message: 'Такого цвета нет' })
      }
      if (!product.options.includes(line.option)) {
        errors.push({ field: `lines.${i}.option`, message: 'Такого варианта нет' })
      }
      const key = `${line.productId}|${line.colorName}|${line.option}`
      const prev = merged.get(key)
      const qty = (prev?.qty ?? 0) + line.qty
      if (qty > MAX_QTY_PER_LINE) {
        errors.push({
          field: `lines.${i}.qty`,
          message: `Не больше ${MAX_QTY_PER_LINE} штук одного товара`,
        })
      }
      merged.set(key, {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        kind: product.kind,
        colorName: line.colorName,
        option: line.option,
        unitPrice: product.price,
        qty,
        lineTotal: product.price * qty,
        imageId: getImage(product, { color: line.colorName })?.id ?? null,
      })
    }
    if (errors.length) throw new ValidationException(errors)

    const stale = dto.lines.filter(
      (l) => l.price !== undefined && l.price !== products.get(l.productId)?.product.price,
    )
    if (stale.length) {
      const lines = [...merged.values()]
      throw conflict(
        ErrorCode.PriceChanged,
        'Цены изменились. Проверьте корзину и подтвердите заказ ещё раз',
        {
          lines: lines.map((l) => ({
            productId: l.productId,
            colorName: l.colorName,
            option: l.option,
            price: l.unitPrice,
          })),
        },
      )
    }
    return [...merged.values()]
  }

  private qtyByProduct(lines: PricedLine[]) {
    const totals = new Map<number, number>()
    for (const l of lines) totals.set(l.productId, (totals.get(l.productId) ?? 0) + l.qty)
    // Fixed order: concurrent orders lock product rows in the same sequence, avoiding deadlocks.
    return [...totals.entries()].sort(([a], [b]) => a - b)
  }

  /** Order numbers are random: on the rare collision, retry with a fresh one. */
  private async createWithUniqueNumber<T>(create: (number: string) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await create(generateOrderNumber())
      } catch (err) {
        if (attempt < MAX_NUMBER_ATTEMPTS && this.isUniqueViolation(err, 'number')) continue
        throw err
      }
    }
  }

  private isUniqueViolation(err: unknown, field: string) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
    const meta = JSON.stringify(err.meta ?? {})
    return meta.includes(field)
  }
}
