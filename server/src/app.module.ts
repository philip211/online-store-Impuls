import { randomUUID } from 'node:crypto'

import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'

import { ProblemDetailsFilter } from './common/filters/problem-details.filter'
import { AuthGuard } from './common/guards/auth.guard'
import { Env, NodeEnv } from './config/env'
import { EnvModule } from './config/env.module'
import { AccountModule } from './modules/account/account.module'
import { AdminModule } from './modules/admin/admin.module'
import { AuditModule } from './modules/audit/audit.module'
import { AuthModule } from './modules/auth/auth.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { HealthModule } from './modules/health/health.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { OrdersModule } from './modules/orders/orders.module'
import { ReturnsModule } from './modules/returns/returns.module'
import { ReviewsModule } from './modules/reviews/reviews.module'
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'
import { PrismaModule } from './prisma/prisma.module'

const REQUEST_ID = /^[\w-]{1,64}$/

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRootAsync({
      inject: [Env],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.NODE_ENV === NodeEnv.Test ? 'silent' : env.LOG_LEVEL,
          transport:
            env.NODE_ENV === NodeEnv.Development
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
                }
              : undefined,
          // Correlates logs across services: reuse the caller's id when it looks sane.
          genReqId: (req, res) => {
            const incoming = req.headers['x-request-id']
            const id =
              typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID()
            res.setHeader('X-Request-Id', id)
            return id
          },
          // One compact line per request; headers stay out (they carry tokens and cookies).
          serializers: {
            req: (req: { id: string; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
          },
          // Secrets and personal data never reach the logs.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.passwordHash',
            ],
            censor: '[redacted]',
          },
          customLogLevel: (_req, res, err) =>
            err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    JwtModule.register({ global: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    ReviewsModule,
    OrdersModule,
    ReturnsModule,
    SubscriptionsModule,
    AccountModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
