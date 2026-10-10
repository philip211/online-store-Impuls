import { HttpStatus, Injectable } from '@nestjs/common'

import { AppException, ErrorCode, unprocessable } from '../../common/errors'
import { safeEqual } from '../../common/lib/crypto'
import { normalizePhone } from '../../common/lib/phone'
import { PrismaService } from '../../prisma/prisma.service'
import { OutboxService } from '../notifications/outbox.service'
import { RETURN_DAYS } from '../orders/domain/commerce'
import { makeReturnRef, parseOrderNumber } from '../orders/domain/order-number'
import type { CreateReturnDto, ReturnCreatedDto } from './dto/return.dto'

const DAY_MS = 86_400_000

const notFound = () =>
  new AppException(
    HttpStatus.NOT_FOUND,
    ErrorCode.OrderNotFound,
    'Заказ не найден. Проверьте номер и телефон',
  )

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * A return request for a delivered order within the return window. The manager then calls
   * the buyer; money goes back once the goods arrive (status COMPLETED in the admin panel).
   */
  async create(dto: CreateReturnDto): Promise<ReturnCreatedDto> {
    const number = parseOrderNumber(dto.order)
    const phone = normalizePhone(dto.phone)
    if (!number || !phone) throw notFound()

    const order = await this.prisma.order.findUnique({
      where: { number },
      include: {
        events: { where: { status: 'DELIVERED' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!order || !safeEqual(order.phone, phone)) throw notFound()

    const deliveredAt = order.events[0]?.createdAt
    if (order.status !== 'DELIVERED' || !deliveredAt) {
      throw unprocessable(
        ErrorCode.ReturnNotAllowed,
        'Вернуть можно полученный заказ. Если хотите отказаться от заказа в пути — позвоните нам',
      )
    }
    if (Date.now() - deliveredAt.getTime() > RETURN_DAYS * DAY_MS) {
      throw unprocessable(
        ErrorCode.ReturnNotAllowed,
        `Срок возврата — ${RETURN_DAYS} дней с получения, он прошёл`,
      )
    }

    const open = await this.prisma.returnRequest.findFirst({
      where: { orderId: order.id, status: { in: ['REQUESTED', 'APPROVED'] } },
    })
    if (open) return { ref: open.ref, order: number }

    const ref = makeReturnRef(number)
    await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.create({ data: { ref, orderId: order.id, reason: dto.reason } })
      if (order.email) {
        await this.outbox.enqueue({ type: 'return.requested', to: order.email, ref, number }, tx)
      }
    })
    return { ref, order: number }
  }
}
