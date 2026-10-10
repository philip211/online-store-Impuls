import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import {
  EmailDto,
  RestockDto,
  RestockSubscribedDto,
  SubscribedDto,
  TokenQueryDto,
} from './dto/subscriptions.dto'
import { NewsletterService, RestockService } from './subscriptions.service'

const LIMIT = { default: { limit: 10, ttl: 60_000 } }

const page = (title: string, text: string) =>
  `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:18px/1.5 system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px"><h1 style="font-size:24px">${title}</h1><p>${text}</p></body></html>`

@ApiTags('Подписки')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle(LIMIT)
  @ApiOperation({ summary: 'Подписка на рассылку: на почту уходит письмо с подтверждением' })
  subscribe(@Body() { email }: EmailDto): Promise<SubscribedDto> {
    return this.newsletter.subscribe(email)
  }

  /* Links from the email open in a browser, so these answer with a small HTML page. */

  @Get('confirm')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiProduces('text/html')
  @ApiOperation({ summary: 'Подтверждение подписки по ссылке из письма' })
  async confirm(@Query() { token }: TokenQueryDto): Promise<string> {
    return (await this.newsletter.confirm(token))
      ? page('Подписка подтверждена', 'Будем писать о новинках и скидках не чаще раза в неделю.')
      : page('Ссылка устарела', 'Подпишитесь ещё раз на сайте магазина.')
  }

  @Get('unsubscribe')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiProduces('text/html')
  @ApiOperation({ summary: 'Отписка по ссылке из письма' })
  async unsubscribe(@Query() { token }: TokenQueryDto): Promise<string> {
    await this.newsletter.unsubscribe(token)
    return page('Вы отписались', 'Больше не будем присылать рассылку на этот адрес.')
  }
}

@ApiTags('Подписки')
@Controller('restock-subscriptions')
export class RestockController {
  constructor(private readonly restock: RestockService) {}

  @Post()
  @Throttle(LIMIT)
  @ApiOperation({ summary: '«Сообщить о поступлении»: письмо придёт, когда товар появится' })
  subscribe(@Body() dto: RestockDto): Promise<RestockSubscribedDto> {
    return this.restock.subscribe(dto.productId, dto.email)
  }
}
