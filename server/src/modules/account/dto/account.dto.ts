import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

import { PageMetaDto } from '../../../common/dto/pagination.dto'
import { ProductDto } from '../../catalog/dto/product.dto'
import { OrderDto, TrackingDto } from '../../orders/dto/order.dto'
import { PASSWORD_RULE } from '../../auth/dto/auth.dto'
import { MAX_QTY_PER_LINE } from '../../orders/domain/commerce'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string

  /** Empty string removes the phone. */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(128)
  currentPassword: string

  @IsString()
  @Matches(PASSWORD_RULE, { message: 'Пароль: от 8 символов, хотя бы одна буква и одна цифра' })
  newPassword: string
}

export class ProductIdsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds: number[]
}

export class CartLineInputDto {
  @IsInt()
  @Min(1)
  productId: number

  @IsString()
  @MaxLength(80)
  colorName: string

  @IsString()
  @MaxLength(120)
  option: string

  @IsInt()
  @Min(1)
  @Max(MAX_QTY_PER_LINE)
  qty: number
}

export class ReplaceCartDto {
  @ValidateNested({ each: true })
  @Type(() => CartLineInputDto)
  @ArrayMaxSize(50)
  items: CartLineInputDto[]
}

export class CartLineDto {
  productId: number
  colorName: string
  option: string
  qty: number
  /** Current catalogue data: price and stock may have changed since the item was added. */
  product: ProductDto
}

export class CartDto {
  items: CartLineDto[]
  /** At current prices. */
  subtotal: number
}

export class OrderPageDto {
  items: OrderDto[]
  meta: PageMetaDto
}

export class AccountOrderDto extends OrderDto {
  /** The same timeline as public tracking: real dates for reached steps. */
  tracking: TrackingDto
}
