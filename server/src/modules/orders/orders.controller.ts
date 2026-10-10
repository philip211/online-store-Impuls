import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { ApiConflictResponse, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { type AuthUser, OptionalUser } from '../../common/auth'
import { AppException, ErrorCode } from '../../common/errors'
import {
  OrderDto,
  OrderNumberParamDto,
  PlacedOrderDto,
  PlaceOrderDto,
  TrackingDto,
  TrackOrderDto,
} from './dto/order.dto'
import { OrdersService } from './orders.service'

const IDEMPOTENCY_KEY = /^[\w-]{8,128}$/

@ApiTags('Заказы')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Уникальный ключ попытки оформления (UUID). Повтор с тем же ключом вернёт тот же заказ',
  })
  @ApiOperation({
    summary: 'Оформление заказа',
    description:
      'Цены и итог считает сервер. Для оплаты картой в ответе `paymentInfo.confirmationUrl` — туда нужно перенаправить покупателя. ' +
      'Если вошедший пользователь передал Bearer-токен, заказ привязывается к аккаунту.',
  })
  @ApiConflictResponse({ description: 'OUT_OF_STOCK, PRICE_CHANGED или PRODUCT_UNAVAILABLE' })
  place(
    @Body() dto: PlaceOrderDto,
    @Headers('idempotency-key') key: string | undefined,
    @OptionalUser() user?: AuthUser,
  ): Promise<PlacedOrderDto> {
    if (!key || !IDEMPOTENCY_KEY.test(key)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.IdempotencyKeyRequired,
        'Нужен заголовок Idempotency-Key: 8–128 символов из букв, цифр, «-» и «_»',
      )
    }
    return this.orders.place(dto, key, user?.id)
  }

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Где мой заказ: статус по номеру и телефону' })
  track(@Body() dto: TrackOrderDto): Promise<TrackingDto> {
    return this.orders.track(dto)
  }

  @Get(':number')
  @ApiHeader({
    name: 'X-Order-Key',
    required: false,
    description: 'accessKey из ответа на оформление',
  })
  @ApiOperation({ summary: 'Заказ для гостя (по X-Order-Key) или владельца аккаунта' })
  get(
    @Param() { number }: OrderNumberParamDto,
    @Headers('x-order-key') key: string | undefined,
    @OptionalUser() user?: AuthUser,
  ): Promise<OrderDto> {
    return this.orders.getForGuest(number, key, user?.id)
  }

  @Post(':number/payment')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiHeader({ name: 'X-Order-Key', required: false })
  @ApiOperation({ summary: 'Новая ссылка на оплату для неоплаченного заказа' })
  retryPayment(
    @Param() { number }: OrderNumberParamDto,
    @Headers('x-order-key') key: string | undefined,
    @OptionalUser() user?: AuthUser,
  ): Promise<OrderDto> {
    return this.orders.retryPayment(number, key, user?.id)
  }
}
