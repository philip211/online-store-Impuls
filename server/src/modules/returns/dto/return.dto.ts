import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString, MaxLength } from 'class-validator'

import { ReturnReason } from '../../../../generated/prisma/client'

export class CreateReturnDto {
  /** IM-123456 */
  @IsString()
  @MaxLength(20)
  order: string

  /** Phone the order was placed with: proves the request comes from the buyer. */
  @IsString()
  @MaxLength(32)
  phone: string

  @IsEnum(ReturnReason)
  @ApiProperty({ enum: ReturnReason })
  reason: ReturnReason
}

export class ReturnCreatedDto {
  /** RT-3456-0710-42 */
  ref: string
  order: string
}
