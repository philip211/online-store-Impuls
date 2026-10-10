import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEmail,
  IsEnum,
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

import { OrderStatus, PaymentMethod, ShippingMethod } from '../../../../generated/prisma/client'
import { MAX_QTY_PER_LINE } from '../domain/commerce'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

/** The checkout form, same fields and limits as the storefront's zod schema. */
export class CustomerDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Напишите, как к вам обращаться' })
  @MaxLength(80, { message: 'Слишком длинное имя' })
  name: string

  /** Any format with 11 digits: +7 900 123-45-67, 89001234567. */
  @IsString()
  @MaxLength(32)
  phone: string

  /** Optional: order confirmation and status emails. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail({}, { message: 'Похоже, в адресе опечатка' })
  @MaxLength(254)
  email?: string

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Без адреса не довезём' })
  @MaxLength(240, { message: 'Слишком длинный адрес' })
  address: string

  /** Flat, entrance, floor, intercom. */
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  addressExtra = ''

  @IsEnum(ShippingMethod)
  shipping: ShippingMethod

  @IsEnum(PaymentMethod)
  payment: PaymentMethod

  @IsBoolean()
  gift = false

  @Transform(trim)
  @IsString()
  @MaxLength(140, { message: 'Открытка вмещает 140 символов' })
  giftMessage = ''

  /** Paper receipt not needed. */
  @IsBoolean()
  noReceipt = false
}

export class OrderLineInputDto {
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

  /** Price the shopper saw. If it differs from the current one, the order is not placed. */
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number
}

export class PlaceOrderDto {
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto

  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  @ArrayMinSize(1, { message: 'Корзина пуста' })
  @ArrayMaxSize(50)
  lines: OrderLineInputDto[]

  /** Total the shopper agreed to. A mismatch returns 409 PRICE_CHANGED with fresh prices. */
  @IsOptional()
  @IsInt()
  @Min(0)
  total?: number
}

export class OrderItemDto {
  productId: number
  slug: string
  name: string
  kind: string
  colorName: string
  option: string
  unitPrice: number
  qty: number
  lineTotal: number
  @ApiProperty({ type: String, nullable: true })
  imageId: string | null
}

export class PaymentInfoDto {
  @ApiProperty({ enum: ['PENDING', 'WAITING_FOR_CAPTURE', 'SUCCEEDED', 'CANCELED', 'REFUNDED'] })
  status: string
  /** Send the shopper here to pay. Null when nothing is left to pay. */
  @ApiProperty({ type: String, nullable: true })
  confirmationUrl: string | null
  @ApiProperty({ type: String, nullable: true, format: 'date-time' })
  expiresAt: string | null
}

export class OrderDto {
  /** IM-123456 */
  number: string
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus
  statusLabel: string
  name: string
  /** +7 900 123-45-67 */
  phone: string
  @ApiProperty({ type: String, nullable: true })
  email: string | null
  address: string
  addressExtra: string
  @ApiProperty({ enum: ShippingMethod })
  shipping: ShippingMethod
  @ApiProperty({ enum: PaymentMethod })
  payment: PaymentMethod
  gift: boolean
  giftMessage: string
  subtotal: number
  shippingCost: number
  total: number
  deliveryFrom: string
  deliveryTo: string
  createdAt: string
  items: OrderItemDto[]
  @ApiProperty({ type: PaymentInfoDto, nullable: true })
  paymentInfo: PaymentInfoDto | null
}

export class PlacedOrderDto extends OrderDto {
  /**
   * Secret for this order: send as `X-Order-Key` to read it later without an account
   * (e.g. after returning from the payment page). Shown once.
   */
  accessKey: string
}

export class TrackOrderDto {
  /** IM-123456, im 123456 or 123456. */
  @IsString()
  @MaxLength(20)
  order: string

  @IsString()
  @MaxLength(32)
  phone: string
}

export class TrackingStepDto {
  label: string
  detail: string
  /** ISO date: when the step happened, or when it is expected. */
  date: string
  done: boolean
}

export class TrackingDto {
  number: string
  @ApiProperty({ enum: ShippingMethod })
  method: ShippingMethod
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus
  statusLabel: string
  cancelled: boolean
  steps: TrackingStepDto[]
  /** Index of the latest completed step; -1 while waiting for payment. */
  current: number
}

export class OrderNumberParamDto {
  @Matches(/^IM-\d{6}$/, { message: 'Номер выглядит так: IM-123456' })
  number: string
}
