import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { ImageRole, ImageTone } from '../../../../generated/prisma/client'
import { PageMetaDto, PaginationQueryDto } from '../../../common/dto/pagination.dto'
import { ProductDto } from '../../catalog/dto/product.dto'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
const HEX = /^#[0-9a-f]{6}$/i

export class ColorInputDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string

  @Matches(HEX, { message: 'Цвет в формате #rrggbb' })
  hex: string
}

export class SpecInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  value: string
}

export class DimensionsInputDto {
  @IsString()
  @MaxLength(120)
  size: string

  @IsString()
  @MaxLength(60)
  weight: string

  @IsString()
  @MaxLength(200)
  compare: string
}

export class CreditInputDto {
  @IsString()
  @MaxLength(120)
  author: string

  @IsUrl()
  authorUrl: string

  @IsUrl()
  sourceUrl: string

  @IsString()
  @MaxLength(60)
  id: string
}

/**
 * Photo metadata: either from the storefront's media pipeline (`n`, files in /media/<slug>/)
 * or from POST /admin/media (`path`, files in the uploads folder).
 */
export class ImageInputDto {
  /** Pipeline photos: number in /media/<slug>/<n>-<width>.<ext>. Assigned by the server for uploads. */
  @IsOptional()
  @IsInt()
  @Min(1)
  n?: number

  /** Uploaded photos: the `path` returned by POST /admin/media. */
  @IsOptional()
  @Matches(/^products\/[0-9a-f-]{36}\/$/, {
    message: 'path берётся из ответа POST /admin/media',
  })
  path?: string

  @IsEnum(ImageRole)
  @ApiProperty({ enum: ImageRole })
  role: ImageRole

  @IsString()
  @MaxLength(80)
  color: string

  @IsString()
  @MaxLength(300)
  alt: string

  @Matches(/^\d{1,3}% \d{1,3}%$/)
  focal: string

  @IsEnum(ImageTone)
  @ApiProperty({ enum: ImageTone })
  tone: ImageTone

  /** Stock photo attribution; omit or null for the shop's own photos. */
  @IsOptional()
  @ValidateNested()
  @Type(() => CreditInputDto)
  credit?: CreditInputDto | null

  @IsInt()
  @Min(1)
  width: number

  @IsInt()
  @Min(1)
  height: number

  @IsInt({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  widths: number[]

  @Matches(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
  @MaxLength(2000)
  placeholder: string

  @Matches(HEX)
  dominant: string
}

export class CreateProductDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug: латиница, цифры и дефисы' })
  @MaxLength(120)
  slug: string

  @Matches(/^[a-z0-9-]{1,32}$/)
  categoryId: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  kind: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  brand: string

  /** Roubles. */
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  price: number

  /** Price before the discount; must be higher than `price`. */
  @IsOptional()
  @IsInt()
  @Min(1)
  oldPrice?: number | null

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock: number

  @ValidateNested({ each: true })
  @Type(() => ColorInputDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  colors: ColorInputDto[]

  @IsString()
  @MaxLength(60)
  optionLabel: string

  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  options: string[]

  @IsString()
  @MaxLength(5000)
  description: string

  @ValidateNested({ each: true })
  @Type(() => SpecInputDto)
  @ArrayMaxSize(40)
  specs: SpecInputDto[]

  /** Defaults to 0. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  popularity?: number

  /** Use cases and synonyms for search: "для бега", "в подарок". */
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  @ArrayMaxSize(60)
  tags?: string[]

  @ValidateNested()
  @Type(() => DimensionsInputDto)
  dimensions: DimensionsInputDto

  /** Position in "Выбор недели"; null removes the product from it. */
  @IsOptional()
  @IsInt()
  @Min(0)
  featuredRank?: number | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  /** At least one; exactly one with role `primary`. */
  @ValidateNested({ each: true })
  @Type(() => ImageInputDto)
  @ArrayMinSize(1, { message: 'Добавьте хотя бы одно фото: без него карточка пустая' })
  @ArrayMaxSize(30)
  images: ImageInputDto[]
}

/*
 * No property initializers above: PartialType copies them into every update, so a PATCH of
 * one field would silently reset the others. Stock is not editable here either: it changes
 * only through PATCH /admin/products/:id/stock, which locks the row, so a form opened before
 * a sale cannot write the old number back.
 */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['stock'] as const)) {}

export class StockDto {
  /** New stock level. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number

  /** Or a change: +5 for a delivery, −1 for a write-off. */
  @IsOptional()
  @IsInt()
  delta?: number
}

export class AdminProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  @IsOptional()
  @Matches(/^[a-z0-9-]{1,32}$/)
  category?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean

  /** Only products with stock at or below this level. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStock?: number
}

/** Raw photo metadata, ready to send back in `images` when editing. */
export class AdminPhotoDto extends ImageInputDto {
  /** Preview URL (not accepted back). */
  src: string
}

export class UploadedPhotoDto {
  /** Pass back as images[].path. */
  path: string
  width: number
  height: number
  widths: number[]
  placeholder: string
  dominant: string
  @ApiProperty({ enum: ImageTone })
  tone: 'light' | 'mid' | 'dark'
  /** Preview URL. */
  src: string
}

export class AdminProductDto extends ProductDto {
  /** Photos as stored, for the editor. */
  photos: AdminPhotoDto[]
  stock: number
  isActive: boolean
  @ApiProperty({ type: Number, nullable: true })
  featuredRank: number | null
  createdAt: Date
  updatedAt: Date
}

export class AdminProductPageDto {
  items: AdminProductDto[]
  meta: PageMetaDto
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string

  @IsOptional()
  @IsInt()
  sortOrder?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  coverProductId?: number | null
}
