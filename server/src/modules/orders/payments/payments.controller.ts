import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common'
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import type { Request, Response } from 'express'

import { Env } from '../../../config/env'
import { PAYMENT_GATEWAY, type PaymentGateway } from './gateway'
import { isYooKassaAddress } from './ip-allowlist'
import { MockGateway } from './mock.gateway'
import { PaymentsService } from './payments.service'

/** Shape of a ЮKassa notification; only the payment id is used. */
type YooKassaNotification = { type?: unknown; event?: unknown; object?: { id?: unknown } }

const MOCK_ID = /^mock-[0-9a-f-]{36}$/

@ApiTags('Оплата')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name)

  constructor(
    private readonly payments: PaymentsService,
    private readonly env: Env,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly mock: MockGateway,
  ) {}

  /**
   * ЮKassa notifications are not signed, so the body is not trusted: the sender's IP is
   * checked, and the payment is re-read from the ЮKassa API before anything changes.
   * Answers 200 to anything well-formed, otherwise ЮKassa retries for a day.
   */
  @Post('webhooks/yookassa')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'HTTP-уведомления ЮKassa о смене статуса платежа' })
  async yookassaWebhook(
    @Body() body: YooKassaNotification,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    if (this.gateway.provider !== 'yookassa') throw new NotFoundException()
    if (this.env.YOOKASSA_CHECK_WEBHOOK_IP && !isYooKassaAddress(req.ip)) {
      this.logger.warn(`Webhook from foreign address ${req.ip}`)
      throw new ForbiddenException()
    }
    const id = body.object?.id
    if (typeof id === 'string' && /^[\w-]{1,64}$/.test(id)) {
      await this.payments.sync(id)
    } else {
      this.logger.warn(`Malformed webhook: ${JSON.stringify(body).slice(0, 300)}`)
    }
    return { ok: true }
  }

  /* Mock provider: a stand-in payment page for development. */

  @Get('mock/:id')
  @ApiExcludeEndpoint()
  mockPage(@Param('id') id: string, @Res() res: Response) {
    const payment = this.mockPayment(id)
    const amount = `${payment.amount.toLocaleString('ru-RU')} ₽`
    const action = (verb: string) => `/api/v1/payments/mock/${id}/${verb}`
    this.mockHeaders(res)
    res.type('html').send(`<!doctype html><html lang="ru"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Тестовая оплата</title>
<body style="font:18px/1.5 system-ui,sans-serif;max-width:420px;margin:12vh auto;padding:0 16px">
<p style="color:#a15c00">Тестовый режим: деньги не списываются</p>
<h1 style="font-size:28px;margin:0 0 24px">К оплате ${amount}</h1>
${
  payment.status === 'PENDING'
    ? `<form method="post" action="${action('confirm')}"><button style="width:100%;padding:14px;font-size:18px;background:#111;color:#fff;border:0;border-radius:10px">Оплатить</button></form>
<form method="post" action="${action('cancel')}" style="margin-top:12px"><button style="width:100%;padding:14px;font-size:18px;background:#fff;border:1px solid #ccc;border-radius:10px">Отменить</button></form>`
    : `<p>Платёж уже обработан.</p><p><a href="${payment.returnUrl}">Вернуться в магазин</a></p>`
}
</body></html>`)
  }

  @Post('mock/:id/confirm')
  @ApiExcludeEndpoint()
  async mockConfirm(@Param('id') id: string, @Res() res: Response) {
    return this.mockSettle(id, 'SUCCEEDED', res)
  }

  @Post('mock/:id/cancel')
  @ApiExcludeEndpoint()
  async mockCancel(@Param('id') id: string, @Res() res: Response) {
    return this.mockSettle(id, 'CANCELED', res)
  }

  private async mockSettle(id: string, status: 'SUCCEEDED' | 'CANCELED', res: Response) {
    const payment = this.mockPayment(id)
    this.mock.settle(id, status, status === 'CANCELED' ? 'canceled_by_customer' : null)
    // Same path a real provider's webhook takes.
    await this.payments.sync(id)
    this.mockHeaders(res)
    res.redirect(HttpStatus.SEE_OTHER, payment.returnUrl)
  }

  private mockPayment(id: string) {
    if (this.gateway.provider !== 'mock' || !MOCK_ID.test(id)) throw new NotFoundException()
    const payment = this.mock.page(id)
    if (!payment) throw new NotFoundException()
    return payment
  }

  /** The page posts to itself and then redirects to the storefront, which helmet's CSP forbids. */
  private mockHeaders(res: Response) {
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${this.env.FRONTEND_URL.join(' ')}`,
    )
    res.setHeader('Cache-Control', 'no-store')
  }
}
