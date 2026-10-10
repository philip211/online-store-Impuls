import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { CreateReturnDto, ReturnCreatedDto } from './dto/return.dto'
import { ReturnsService } from './returns.service'

@ApiTags('Возвраты')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Заявка на возврат по номеру заказа и телефону' })
  create(@Body() dto: CreateReturnDto): Promise<ReturnCreatedDto> {
    return this.returns.create(dto)
  }
}
