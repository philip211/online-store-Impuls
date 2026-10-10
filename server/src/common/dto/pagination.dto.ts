import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export class PaginationQueryDto {
  /** Page number, starting at 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  /** Items per page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20

  get skip() {
    return (this.page - 1) * this.limit
  }
}

export class PageMetaDto {
  page: number
  limit: number
  total: number
  pages: number
}

export type Page<T> = { items: T[]; meta: PageMetaDto }

export function page<T>(items: T[], total: number, q: PaginationQueryDto): Page<T> {
  return { items, meta: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } }
}
