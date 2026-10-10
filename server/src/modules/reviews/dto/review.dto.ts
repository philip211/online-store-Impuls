import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export const REVIEW_SORTS = ['helpful', 'new', 'low'] as const
export type ReviewSort = (typeof REVIEW_SORTS)[number]

export class ReviewsQueryDto {
  /** Reviews of every product in a section (the product page shows its section's reviews). */
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,32}$/)
  category?: string

  /** Reviews of one product. */
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,120}$/)
  product?: string

  @IsOptional()
  @IsIn(REVIEW_SORTS)
  sort?: ReviewSort

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}

export class ReviewDto {
  id: string
  author: string
  @ApiProperty({ minimum: 1, maximum: 5 })
  rating: number
  text: string
  /** Publication day, YYYY-MM-DD. */
  date: string
  /** Matched to a delivered order. */
  verified: boolean
  /** "Полезно" votes. */
  helpful: number
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  productId: number

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Расскажите чуть подробнее — от 10 символов' })
  @MaxLength(2000)
  text: string
}

export class ReviewCreatedDto {
  id: string
  /** PENDING: shown after moderation. */
  status: string
}

export class HelpfulDto {
  helpful: number
}
