import type { PaymentProvider, PaymentStatus } from '../../../../generated/prisma/client'

/** Data for a 54-ФЗ fiscal receipt. Amounts are roubles. */
export type ReceiptData = {
  customer: { phone?: string; email?: string }
  items: {
    description: string
    quantity: number
    unitPrice: number
    kind: 'commodity' | 'service'
  }[]
}

export type CreatePaymentInput = {
  /** Roubles. */
  amount: number
  description: string
  returnUrl: string
  /** Same key → same payment at the provider: a retried request never charges twice. */
  idempotenceKey: string
  metadata: Record<string, string>
  receipt?: ReceiptData
}

export type GatewayPayment = {
  id: string
  status: PaymentStatus
  /** Roubles. */
  amount: number
  /** Where to send the shopper to pay; null once the payment is final. */
  confirmationUrl: string | null
  cancellationReason: string | null
}

/** A payment service provider. Implementations: YooKassa (production) and a local mock. */
export interface PaymentGateway {
  readonly provider: PaymentProvider
  create(input: CreatePaymentInput): Promise<GatewayPayment>
  /** Authoritative state, fetched from the provider: webhooks are only a hint to call this. */
  get(id: string): Promise<GatewayPayment>
  cancel(id: string, idempotenceKey: string): Promise<GatewayPayment>
  refund(id: string, amount: number, idempotenceKey: string): Promise<void>
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')
