import { Injectable } from '@nestjs/common'

import type { Prisma, Review } from '../../../generated/prisma/client'
import { conflict, ErrorCode, notFound, unprocessable } from '../../common/errors'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateReviewDto, ReviewDto, ReviewSort, ReviewsQueryDto } from './dto/review.dto'

const ORDER_BY: Record<ReviewSort, Prisma.ReviewOrderByWithRelationInput[]> = {
  helpful: [{ helpful: 'desc' }, { createdAt: 'desc' }],
  new: [{ createdAt: 'desc' }],
  low: [{ rating: 'asc' }, { helpful: 'desc' }],
}

/** YYYY-MM-DD in Moscow time: a review written at 01:00 MSK belongs to that day. */
const day = (d: Date) => new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10)

export const toReviewDto = (r: Review): ReviewDto => ({
  id: r.id,
  author: r.author,
  rating: r.rating,
  text: r.text,
  date: day(r.publishedAt ?? r.createdAt),
  verified: r.verified,
  helpful: r.helpful,
})

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ReviewsQueryDto): Promise<ReviewDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        status: 'PUBLISHED',
        product: {
          isActive: true,
          ...(q.category ? { categoryId: q.category } : {}),
          ...(q.product ? { slug: q.product } : {}),
        },
      },
      orderBy: ORDER_BY[q.sort ?? 'helpful'],
      take: q.limit ?? 50,
    })
    return reviews.map(toReviewDto)
  }

  /**
   * Only buyers review: the account needs a delivered order with this product. One review per
   * product per account. New reviews wait for moderation.
   */
  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isActive: true },
    })
    if (!product) throw notFound('Товар не найден')

    const bought = await this.prisma.orderItem.findFirst({
      where: { productId: dto.productId, order: { userId, status: 'DELIVERED' } },
      select: { id: true },
    })
    if (!bought) {
      throw unprocessable(
        ErrorCode.ReviewNotAllowed,
        'Отзыв можно оставить после получения заказа с этим товаром',
      )
    }
    const existing = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId },
    })
    if (existing) throw conflict(ErrorCode.Conflict, 'Вы уже оставили отзыв на этот товар')

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    })
    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        author: user.name,
        rating: dto.rating,
        text: dto.text,
        verified: true,
      },
    })
    return { id: review.id, status: review.status }
  }

  /** "Полезно": one vote per account; voting again changes nothing. */
  async markHelpful(userId: string, reviewId: string) {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findFirst({ where: { id: reviewId, status: 'PUBLISHED' } })
      if (!review) throw notFound('Отзыв не найден')
      const vote = await tx.reviewVote.createMany({
        data: [{ reviewId, userId }],
        skipDuplicates: true,
      })
      if (vote.count === 0) return { helpful: review.helpful }
      const updated = await tx.review.update({
        where: { id: reviewId },
        data: { helpful: { increment: 1 } },
      })
      return { helpful: updated.helpful }
    })
  }
}
