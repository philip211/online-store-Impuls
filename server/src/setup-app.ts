import path from 'node:path'

import { type INestApplication, VersioningType } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { validationPipe } from './common/validation'
import { Env } from './config/env'

/**
 * HTTP setup shared by main.ts and the e2e tests, so tests exercise exactly what ships.
 * Routes live under /api/v1/…; health probes are unversioned (/api/health).
 */
export function setupApp(app: INestApplication) {
  const env = app.get(Env)
  const express = app as NestExpressApplication

  express.set('trust proxy', env.TRUST_PROXY)
  express.disable('x-powered-by')
  express.useBodyParser('json', { limit: '100kb' })

  app.use(helmet())
  app.use(cookieParser())
  app.enableCors({
    origin: env.FRONTEND_URL,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
  // Photos uploaded in the admin panel. Names are random and never reused, so they cache forever.
  // An absolute UPLOADS_BASE_URL means a CDN serves them instead.
  if (env.UPLOADS_BASE_URL.startsWith('/')) {
    express.useStaticAssets(path.resolve(env.UPLOADS_DIR), {
      prefix: env.UPLOADS_BASE_URL.endsWith('/')
        ? env.UPLOADS_BASE_URL
        : `${env.UPLOADS_BASE_URL}/`,
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'deny',
      fallthrough: true,
    })
  }
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
  app.useGlobalPipes(validationPipe)
  app.enableShutdownHooks()

  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('Импульс API')
      .setDescription(
        'API магазина электроники «Импульс». Ошибки — RFC 9457 (application/problem+json) с полем `code`.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config), {
      jsonDocumentUrl: 'api/docs/openapi.json',
    })
  }
}
