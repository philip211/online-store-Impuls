import { HttpStatus, Injectable, Logger } from '@nestjs/common'

import type { PaymentStatus } from '../../../../generated/prisma/client'
import { AppException, ErrorCode } from '../../../common/errors'
import { Env } from '../../../config/env'
import type { CreatePaymentInput, GatewayPayment, PaymentGateway, ReceiptData } from './gateway'

const API = 'https://api.yookassa.ru/v3'
const TIMEOUT_MS = 10_000

type YooAmount = { value: string; currency: 'RUB' }
type YooPayment = {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: YooAmount
  confirmation?: { type: string; confirmation_url?: string }
  cancellation_details?: { party: string; reason: string }
  refunded_amount?: YooAmount
}

const STATUS: Record<YooPayment['status'], PaymentStatus> = {
  pending: 'PENDING',
  waiting_for_capture: 'WAITING_FOR_CAPTURE',
  succeeded: 'SUCCEEDED',
  canceled: 'CANCELED',
}

const amount = (rub: number): YooAmount => ({ value: rub.toFixed(2), currency: 'RUB' })

/**
 * ЮKassa REST API v3 (https://yookassa.ru/developers/api). One-stage payments (capture: true)
 * with redirect confirmation; every mutating call carries an Idempotence-Key.
 */
@Injectable()
export class YooKassaGateway implements PaymentGateway {
  readonly provider = 'yookassa' as const
  private readonly logger = new Logger(YooKassaGateway.name)
  private readonly auth: string

  constructor(private readonly env: Env) {
    this.auth = `Basic ${Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString('base64')}`
  }

  async create(input: CreatePaymentInput): Promise<GatewayPayment> {
    const body = {
      amount: amount(input.amount),
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      description: input.description.slice(0, 128),
      metadata: input.metadata,
      ...(input.receipt && this.env.YOOKASSA_SEND_RECEIPT
        ? { receipt: this.receipt(input.receipt) }
        : {}),
    }
    return this.map(await this.call<YooPayment>('POST', '/payments', body, input.idempotenceKey))
  }

  async get(id: string): Promise<GatewayPayment> {
    return this.map(await this.call<YooPayment>('GET', `/payments/${encodeURIComponent(id)}`))
  }

  async cancel(id: string, idempotenceKey: string): Promise<GatewayPayment> {
    const path = `/payments/${encodeURIComponent(id)}/cancel`
    return this.map(await this.call<YooPayment>('POST', path, {}, idempotenceKey))
  }

  async refund(id: string, rub: number, idempotenceKey: string): Promise<void> {
    await this.call('POST', '/refunds', { payment_id: id, amount: amount(rub) }, idempotenceKey)
  }

  private receipt(r: ReceiptData) {
    return {
      customer: r.customer.email ? { email: r.customer.email } : { phone: r.customer.phone },
      items: r.items.map((i) => ({
        description: i.description.slice(0, 128),
        quantity: i.quantity.toFixed(2),
        amount: amount(i.unitPrice),
        vat_code: this.env.YOOKASSA_VAT_CODE,
        payment_mode: 'full_payment',
        payment_subject: i.kind,
      })),
    }
  }

  private map(p: YooPayment): GatewayPayment {
    return {
      id: p.id,
      status: STATUS[p.status],
      amount: Math.round(Number(p.amount.value)),
      confirmationUrl: p.status === 'pending' ? (p.confirmation?.confirmation_url ?? null) : null,
      cancellationReason: p.cancellation_details?.reason ?? null,
    }
  }

  private async call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    idempotenceKey?: string,
  ): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: this.auth,
        'Content-Type': 'application/json',
        ...(idempotenceKey ? { 'Idempotence-Key': idempotenceKey } : {}),
      },
      body: body === undefined || method === 'GET' ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((err: unknown) => {
      this.logger.error({ err }, `YooKassa ${method} ${path} network error`)
      throw this.unavailable()
    })
    if (!res.ok) {
      // The body explains the problem (code, parameter) and has no secrets.
      this.logger.error(`YooKassa ${method} ${path} → ${res.status}: ${await res.text()}`)
      throw this.unavailable()
    }
    return (await res.json()) as T
  }

  private unavailable() {
    return new AppException(
      HttpStatus.BAD_GATEWAY,
      ErrorCode.PaymentFailed,
      'Платёжный сервис не ответил. Попробуйте ещё раз через минуту',
    )
  }
}
