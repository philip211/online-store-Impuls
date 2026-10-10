import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

import { Prisma } from '../../../generated/prisma/client'
import { AppException, ErrorCode } from '../errors'

type Problem = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  requestId?: string
  [extra: string]: unknown
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.ValidationFailed,
  401: ErrorCode.Unauthorized,
  403: ErrorCode.Forbidden,
  404: ErrorCode.NotFound,
  409: ErrorCode.Conflict,
  429: ErrorCode.TooManyRequests,
}

const DETAIL_BY_STATUS: Partial<Record<number, string>> = {
  401: 'Нужно войти в аккаунт',
  403: 'Недостаточно прав',
  404: 'Не найдено',
  429: 'Слишком много запросов, попробуйте через минуту',
}

/**
 * Renders every error as RFC 9457 problem details (`application/problem+json`), so clients
 * get one shape for validation, domain and unexpected errors alike. Internal details of
 * unexpected errors are logged, never sent.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()
    const problem = this.toProblem(exception)

    problem.instance = req.originalUrl
    if (typeof req.id === 'string' || typeof req.id === 'number') problem.requestId = String(req.id)

    if (problem.status >= 500) {
      this.logger.error(
        { err: exception, requestId: problem.requestId },
        exception instanceof Error ? exception.message : 'Unhandled error',
      )
    }

    if (res.headersSent) return
    // Errors must never be reused by a browser or CDN cache.
    res.setHeader('Cache-Control', 'no-store')
    res.status(problem.status).type('application/problem+json').json(problem)
  }

  private toProblem(exception: unknown): Problem {
    if (exception instanceof AppException) {
      return this.build(exception.getStatus(), exception.code, exception.detail, exception.extra)
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      const message =
        typeof body === 'object' && body !== null && 'message' in body ? body.message : body
      const detail =
        DETAIL_BY_STATUS[status] ?? (typeof message === 'string' ? message : exception.message)
      return this.build(status, CODE_BY_STATUS[status] ?? ErrorCode.Internal, detail)
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique violation that slipped past a service-level check (e.g. a race).
      if (exception.code === 'P2002')
        return this.build(409, ErrorCode.Conflict, 'Такая запись уже существует')
      // "Record to update/delete not found".
      if (exception.code === 'P2025') return this.build(404, ErrorCode.NotFound, 'Не найдено')
    }

    // Malformed JSON body from express.json().
    if (exception instanceof SyntaxError && 'body' in exception) {
      return this.build(400, ErrorCode.ValidationFailed, 'Тело запроса — некорректный JSON')
    }

    return this.build(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.Internal,
      'Что-то пошло не так. Мы уже разбираемся',
    )
  }

  private build(
    status: number,
    code: string,
    detail: string,
    extra: Record<string, unknown> = {},
  ): Problem {
    return {
      type: `https://impulse.store/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title: HttpStatus[status]?.replaceAll('_', ' ').toLowerCase() ?? 'error',
      status,
      detail,
      instance: '',
      code,
      ...extra,
    }
  }
}
