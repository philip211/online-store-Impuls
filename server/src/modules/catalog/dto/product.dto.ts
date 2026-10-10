import { ApiProperty } from '@nestjs/swagger'

/* Response shapes for OpenAPI. They mirror domain/types.ts, which the frontend shares. */

export class ProductColorDto {
  name: string
  /** #rrggbb */
  hex: string
}

export class ProductSpecDto {
  label: string
  value: string
}

export class PhotoCreditDto {
  author: string
  authorUrl: string
  sourceUrl: string
  id: string
}

export class ImageSourceDto {
  @ApiProperty({ enum: ['image/avif', 'image/webp'] })
  type: 'image/avif' | 'image/webp'
  srcSet: string
}

export class ProductImageDto {
  /** `<slug>/<n>`, unique across the catalogue. */
  id: string
  @ApiProperty({ enum: ['primary', 'gallery', 'context'] })
  role: 'primary' | 'gallery' | 'context'
  /** Name of the product colour shown. */
  color: string
  alt: string
  /** CSS object-position that keeps the product in frame. */
  focal: string
  @ApiProperty({ enum: ['light', 'mid', 'dark'] })
  tone: 'light' | 'mid' | 'dark'
  /** Stock photo attribution; null for the shop's own photos. */
  @ApiProperty({ type: PhotoCreditDto, nullable: true })
  credit: PhotoCreditDto | null
  width: number
  height: number
  /** Tiny blurred WebP data URI shown while the photo loads. */
  placeholder: string
  dominant: string
  sources: ImageSourceDto[]
  /** WebP fallback URL. */
  src: string
}

export class ProductDimensionsDto {
  size: string
  weight: string
  compare: string
}

export class ProductDto {
  id: number
  slug: string
  /** Section code: sound, mobile, photo, desk. */
  category: string
  categoryName: string
  kind: string
  name: string
  brand: string
  /** Roubles. */
  price: number
  @ApiProperty({ type: Number, nullable: true })
  oldPrice: number | null
  inStock: boolean
  images: ProductImageDto[]
  colors: ProductColorDto[]
  optionLabel: string
  options: string[]
  description: string
  specs: ProductSpecDto[]
  popularity: number
  tags: string[]
  dimensions: ProductDimensionsDto
}

export class ProductListDto {
  items: ProductDto[]
  total: number
}

export class SearchResultDto {
  products: ProductDto[]
  /** "Did you mean": the query with typos fixed, or null. */
  @ApiProperty({ type: String, nullable: true })
  correctedQuery: string | null
}

export class CategoryCoverDto {
  @ApiProperty({ type: ProductImageDto, nullable: true })
  image: ProductImageDto | null
}

export class CategoryDto {
  id: string
  name: string
  count: number
  cover: CategoryCoverDto
}

export class PriceFacetDto {
  @ApiProperty({ type: Number, nullable: true })
  value: number | null
  count: number
}

export class StockFacetDto {
  any: number
  inStock: number
}

export class ProductFacetsDto {
  total: number
  /** Matches per section code, plus `all`. */
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  category: { all: number } & Partial<Record<string, number>>
  price: PriceFacetDto[]
  stock: StockFacetDto
  /** Result size if the text query were cleared. */
  withoutQuery: number
  /** Highest price in the whole catalogue. */
  catalogMax: number
}
