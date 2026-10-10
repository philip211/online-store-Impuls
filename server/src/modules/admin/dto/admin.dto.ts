import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

import { OrderStatus, ReturnStatus, ReviewStatus, Role } from '../../../../generated/prisma/client'
import { PageMetaDto, PaginationQueryDto } from '../../../common/dto/pagination.dto'
import { UserDto } from '../../auth/dto/auth.dto'
import { OrderDto } from '../../orders/dto/order.dto'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

/* Orders */

export class AdminOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  @ApiProperty({ enum: OrderStatus, required: false })
  status?: OrderStatus

  /** Number, phone digits, name or email. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string
}

export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus

  /** Shown in the order history, e.g. why it was cancelled. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  comment?: string
}

export class OrderEventDto {
  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus
  @ApiProperty({ type: String, nullable: true })
  comment: string | null
  @ApiProperty({ type: String, nullable: true })
  actorId: string | null
  createdAt: Date
}

export class AdminPaymentDto {
  id: string
  provider: string
  providerPaymentId: string
  status: string
  amount: number
  @ApiProperty({ type: String, nullable: true })
  paidAt: Date | null
  createdAt: Date
}

export class AdminOrderDto extends OrderDto {
  id: string
  @ApiProperty({ type: String, nullable: true })
  userId: string | null
  noReceipt: boolean
  /** Statuses this order can move to now. */
  @ApiProperty({ enum: OrderStatus, isArray: true })
  nextStatuses: OrderStatus[]
  events: OrderEventDto[]
  payments: AdminPaymentDto[]
}

export class AdminOrderPageDto {
  items: OrderDto[]
  meta: PageMetaDto
}

/* Reviews */

export class AdminReviewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  @ApiProperty({ enum: ReviewStatus, required: false })
  status?: ReviewStatus
}

export class ModerateReviewDto {
  @IsIn([ReviewStatus.PUBLISHED, ReviewStatus.REJECTED])
  @ApiProperty({ enum: [ReviewStatus.PUBLISHED, ReviewStatus.REJECTED] })
  status: ReviewStatus
}

export class AdminReviewDto {
  id: string
  productId: number
  productName: string
  author: string
  rating: number
  text: string
  @ApiProperty({ enum: ReviewStatus })
  status: ReviewStatus
  verified: boolean
  helpful: number
  createdAt: Date
}

export class AdminReviewPageDto {
  items: AdminReviewDto[]
  meta: PageMetaDto
}

/* Returns */

export class AdminReturnsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReturnStatus)
  @ApiProperty({ enum: ReturnStatus, required: false })
  status?: ReturnStatus
}

export class UpdateReturnDto {
  @IsEnum(ReturnStatus)
  @ApiProperty({ enum: ReturnStatus })
  status: ReturnStatus

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  comment?: string
}

export class AdminReturnDto {
  id: string
  ref: string
  orderNumber: string
  reason: string
  @ApiProperty({ enum: ReturnStatus })
  status: ReturnStatus
  @ApiProperty({ type: String, nullable: true })
  comment: string | null
  createdAt: Date
}

export class AdminReturnPageDto {
  items: AdminReturnDto[]
  meta: PageMetaDto
}

/* Users */

export class AdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ enum: Role, required: false })
  role?: Role
}

export class ChangeRoleDto {
  @IsEnum(Role)
  @ApiProperty({ enum: Role })
  role: Role
}

export class AdminUserPageDto {
  items: UserDto[]
  meta: PageMetaDto
}

/* Dashboard */

export class LowStockDto {
  id: number
  name: string
  stock: number
}

export class StatsDto {
  ordersToday: number
  /** Paid or cash orders not cancelled, last 30 days, roubles. */
  revenue30d: number
  orders30d: number
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<string, number>
  pendingReviews: number
  openReturns: number
  lowStock: LowStockDto[]
}

export class AuditEntryDto {
  id: number
  @ApiProperty({ type: String, nullable: true })
  actorId: string | null
  @ApiProperty({ type: String, nullable: true })
  actorEmail: string | null
  action: string
  entity: string
  entityId: string
  data: unknown
  createdAt: Date
}

export class AuditPageDto {
  items: AuditEntryDto[]
  meta: PageMetaDto
}
