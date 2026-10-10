import { Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

import { PRODUCT_SORTS } from '../domain/catalog'
import type { ProductFilters, ProductSort } from '../domain/types'

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1'
const toList = ({ value }: { value: unknown }) =>
  (Array.isArray(value) ? value : String(value).split(','))
    .map((v) => String(v).trim())
    .filter(Boolean)

/** Same parameters as the storefront URL: ?q=&category=&maxPrice=&inStock=&sort= */
export class ProductFiltersQueryDto {
  /** Free text: typos, wrong layout, "до 20 000", "в наличии", colours. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  /** Section code, or `all`. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,32}$/)
  category?: string

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean

  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort

  toFilters(): ProductFilters {
    return {
      query: this.q?.trim() ?? '',
      category: this.category ?? 'all',
      maxPrice: this.maxPrice ?? null,
      inStockOnly: this.inStock ?? false,
      sort: this.sort ?? 'popular',
    }
  }
}

export class SearchQueryDto {
  @IsString()
  @MaxLength(100)
  q: string

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number
}

/** `?ids=7,2,14` or `?slugs=a,b`: order is kept, unknown entries dropped. */
export class LookupQueryDto {
  @IsOptional()
  @Transform(({ value }) => toList({ value }).map(Number))
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[]

  @IsOptional()
  @Transform(toList)
  @ArrayMaxSize(100)
  @Matches(/^[a-z0-9-]{1,120}$/, { each: true })
  slugs?: string[]
}
