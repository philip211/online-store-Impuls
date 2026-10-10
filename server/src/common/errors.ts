import { HttpException, HttpStatus } from '@nestjs/common'

/** Stable machine-readable codes: clients branch on these, never on the human message. */
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  Internal: 'INTERNAL_ERROR',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  EmailTaken: 'EMAIL_TAKEN',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  ProductUnavailable: 'PRODUCT_UNAVAILABLE',
  OutOfStock: 'OUT_OF_STOCK',
  PriceChanged: 'PRICE_CHANGED',
  IdempotencyMismatch: 'IDEMPOTENCY_KEY_REUSED',
  IdempotencyKeyRequired: 'IDEMPOTENCY_KEY_REQUIRED',
  InvalidStatusTransition: 'INVALID_STATUS_TRANSITION',
  OrderNotFound: 'ORDER_NOT_FOUND',
  ReturnNotAllowed: 'RETURN_NOT_ALLOWED',
  ReviewNotAllowed: 'REVIEW_NOT_ALLOWED',
  PaymentFailed: 'PAYMENT_FAILED',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export type FieldError = { field: string; message: string }

/**
 * Domain error. The filter renders it as RFC 9457 problem details; `extra` lands next to the
 * standard members (e.g. the fresh prices for PRICE_CHANGED).
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    readonly detail: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(detail, status)
  }
}

export const notFound = (detail = 'Не найдено') =>
  new AppException(HttpStatus.NOT_FOUND, ErrorCode.NotFound, detail)

export const conflict = (code: ErrorCode, detail: string, extra?: Record<string, unknown>) =>
  new AppException(HttpStatus.CONFLICT, code, detail, extra)

export const unprocessable = (code: ErrorCode, detail: string, extra?: Record<string, unknown>) =>
  new AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, detail, extra)

export class ValidationException extends AppException {
  constructor(readonly errors: FieldError[]) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.ValidationFailed, 'Проверьте поля запроса', { errors })
  }
}
