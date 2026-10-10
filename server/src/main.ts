import type { Server } from 'node:http'

import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module'
import { Env } from './config/env'
import { setupApp } from './setup-app'

/** Longer than a typical load balancer's idle timeout, so it never reuses a closed socket. */
const KEEP_ALIVE_MS = 65_000

let app: INestApplication | undefined

/**
 * A bug that escaped every handler leaves the process in an unknown state: log it, close
 * gracefully (in-flight requests finish, the DB pool drains) and let the orchestrator restart.
 */
function crash(kind: string, err: unknown) {
  const logger = app?.get(Logger)
  if (logger) logger.error({ err }, kind)
  else console.error(kind, err)
  const timer = setTimeout(() => process.exit(1), 10_000)
  timer.unref()
  void (app?.close() ?? Promise.resolve()).finally(() => process.exit(1))
}

process.on('unhandledRejection', (err) => crash('Unhandled rejection', err))
process.on('uncaughtException', (err) => crash('Uncaught exception', err))

async function bootstrap() {
  app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))
  setupApp(app)

  const env = app.get(Env)
  await app.listen(env.PORT)
  const server = app.getHttpServer() as Server
  server.keepAliveTimeout = KEEP_ALIVE_MS
  server.headersTimeout = KEEP_ALIVE_MS + 1_000
  app.get(Logger).log(`API: ${env.PUBLIC_API_URL}/api/v1 · docs: ${env.PUBLIC_API_URL}/api/docs`)
}

bootstrap().catch((err: unknown) => {
  // Bad config or no database at startup: say why and stop.
  console.error('Failed to start:', err)
  process.exit(1)
})
