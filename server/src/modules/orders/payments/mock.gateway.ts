import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import type { PaymentStatus } from '../../../../generated/prisma/client'
import { Env } from '../../../config/env'
import type { CreatePaymentInput, GatewayPayment, PaymentGateway } from './gateway'

type MockState = { status: PaymentStatus; amount: number; returnUrl: string; reason: string | null }

/**
 * Local stand-in for a real provider: the "payment page" is served by this API
 * (/api/v1/payments/mock/:id) with Pay and Cancel buttons. State lives in memory, which is
 * enough for development and tests; production refuses to start with it (see env.ts).
 */
@Injectable()
export class MockGateway implements PaymentGateway {
  readonly provider = 'mock' as const
  private readonly payments = new Map<string, MockState>()
  private readonly byKey = new Map<string, string>()

  constructor(private readonly env: Env) {}

  async create(input: CreatePaymentInput): Promise<GatewayPayment> {
    const known = this.byKey.get(input.idempotenceKey)
    if (known) return this.get(known)
    const id = `mock-${randomUUID()}`
    this.byKey.set(input.idempotenceKey, id)
    this.payments.set(id, {
      status: 'PENDING',
      amount: input.amount,
      returnUrl: input.returnUrl,
      reason: null,
    })
    return this.get(id)
  }

  get(id: string): Promise<GatewayPayment> {
    const p = this.payments.get(id)
    // Unknown after a restart: report it as still pending, like an abandoned payment page.
    if (!p) {
      return Promise.resolve({
        id,
        status: 'PENDING',
        amount: 0,
        confirmationUrl: null,
        cancellationReason: null,
      })
    }
    return Promise.resolve({
      id,
      status: p.status,
      amount: p.amount,
      confirmationUrl:
        p.status === 'PENDING' ? `${this.env.PUBLIC_API_URL}/api/v1/payments/mock/${id}` : null,
      cancellationReason: p.reason,
    })
  }

  async cancel(id: string): Promise<GatewayPayment> {
    this.settle(id, 'CANCELED', 'expired_on_confirmation')
    return this.get(id)
  }

  refund(id: string): Promise<void> {
    const p = this.payments.get(id)
    if (p) p.status = 'REFUNDED'
    return Promise.resolve()
  }

  /** What the mock payment page does when the shopper presses a button. */
  settle(id: string, status: 'SUCCEEDED' | 'CANCELED', reason: string | null = null) {
    const p = this.payments.get(id)
    if (p?.status === 'PENDING') {
      p.status = status
      p.reason = reason
    }
  }

  page(id: string): MockState | undefined {
    return this.payments.get(id)
  }
}
