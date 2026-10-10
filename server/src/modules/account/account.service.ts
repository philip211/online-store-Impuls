import { Injectable } from '@nestjs/common'

import { notFound, ValidationException } from '../../common/errors'
import { type PaginationQueryDto, page } from '../../common/dto/pagination.dto'
import { normalizePhone } from '../../common/lib/phone'
import { PrismaService } from '../../prisma/prisma.service'
import { toUserDto } from '../auth/auth.service'
import { CatalogService } from '../catalog/catalog.service'
import { MAX_QTY_PER_LINE } from '../orders/domain/commerce'
import { buildTracking } from '../orders/domain/status'
import { orderInclude, toOrderDto } from '../orders/order.mapper'
import type { CartDto, ReplaceCartDto, UpdateProfileDto } from './dto/account.dto'

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async profile(userId: string) {
    return toUserDto(await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }))
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    let phone: string | null | undefined
    if (dto.phone !== undefined) {
      phone = dto.phone.trim() === '' ? null : normalizePhone(dto.phone)
      if (phone === null && dto.phone.trim() !== '') {
        throw new ValidationException([
          { field: 'phone', message: 'Нужен российский номер из 11 цифр' },
        ])
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    })
    return toUserDto(user)
  }

  async orders(userId: string, q: PaginationQueryDto) {
    const where = { userId }
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

  async order(userId: string, number: string) {
    const order = await this.prisma.order.findFirst({
      where: { number, userId },
      include: { ...orderInclude, events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!order) throw notFound('Заказ не найден')
    return { ...toOrderDto(order), tracking: buildTracking(order) }
  }

  /* Wishlist: products that left the catalogue are skipped, not errors. */

  async wishlist(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { productId: true },
    })
    return this.catalog.byIds(items.map((i) => i.productId))
  }

  async addToWishlist(userId: string, productId: number) {
    const [product] = await this.catalog.byIds([productId])
    if (!product) throw notFound('Товар не найден')
    await this.prisma.wishlistItem.createMany({
      data: [{ userId, productId }],
      skipDuplicates: true,
    })
  }

  async removeFromWishlist(userId: string, productId: number) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } })
  }

  /** After sign-in: the guest's local favourites join the account's. */
  async mergeWishlist(userId: string, productIds: number[]) {
    const known = await this.catalog.byIds([...new Set(productIds)])
    await this.prisma.wishlistItem.createMany({
      data: known.map((p) => ({ userId, productId: p.id })),
      skipDuplicates: true,
    })
    return this.wishlist(userId)
  }

  /* Cart, synced across devices. The server keeps product, variant and quantity; prices are
     always current. Lines of products that left the catalogue are dropped on read. */

  async cart(userId: string): Promise<CartDto> {
    const rows = await this.prisma.cartItem.findMany({ where: { userId }, orderBy: { id: 'asc' } })
    const products = new Map(
      (await this.catalog.byIds(rows.map((r) => r.productId))).map((p) => [p.id, p]),
    )
    const items = rows.flatMap((r) => {
      const product = products.get(r.productId)
      return product
        ? { productId: r.productId, colorName: r.colorName, option: r.option, qty: r.qty, product }
        : []
    })
    return { items, subtotal: items.reduce((sum, i) => sum + i.product.price * i.qty, 0) }
  }

  async replaceCart(userId: string, dto: ReplaceCartDto): Promise<CartDto> {
    const products = new Map(
      (await this.catalog.byIds([...new Set(dto.items.map((i) => i.productId))])).map((p) => [
        p.id,
        p,
      ]),
    )
    // Unknown products and variants are dropped; the same variant twice is summed.
    const lines = new Map<
      string,
      { productId: number; colorName: string; option: string; qty: number }
    >()
    for (const i of dto.items) {
      const p = products.get(i.productId)
      if (!p || !p.colors.some((c) => c.name === i.colorName) || !p.options.includes(i.option))
        continue
      const key = `${i.productId}|${i.colorName}|${i.option}`
      const qty = Math.min((lines.get(key)?.qty ?? 0) + i.qty, MAX_QTY_PER_LINE)
      lines.set(key, { productId: i.productId, colorName: i.colorName, option: i.option, qty })
    }
    await this.prisma.$transaction(async (tx) => {
      // Two tabs syncing at once take turns instead of colliding on the unique key.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`
      await tx.cartItem.deleteMany({ where: { userId } })
      await tx.cartItem.createMany({ data: [...lines.values()].map((l) => ({ ...l, userId })) })
    })
    return this.cart(userId)
  }
}
