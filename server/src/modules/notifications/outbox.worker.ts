import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'

import { Env, NodeEnv } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import { MailService } from './mail.service'
import { type MailMessage, render } from './templates'

const BATCH = 20
const MAX_ATTEMPTS = 8
/** A claimed message is invisible to other workers this long: enough to send one batch. */
const LEASE_SECONDS = 300

/** 30 s, 1 min, 2 min … capped at 1 h. */
const backoff = (attempt: number) => Math.min(30_000 * 2 ** (attempt - 1), 3_600_000)

type Claimed = { id: string; payload: MailMessage; attempts: number }

/**
 * Delivers queued emails. Safe on several instances: each claims a batch atomically
 * (FOR UPDATE SKIP LOCKED) under a lease, so an email is not sent twice in normal operation,
 * and the batch of a crashed worker is retried once its lease runs out.
 */
@Injectable()
export class OutboxWorker implements OnApplicationShutdown {
  private readonly logger = new Logger(OutboxWorker.name)
  private running = false
  private stopped = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly env: Env,
  ) {}

  onApplicationShutdown() {
    this.stopped = true
  }

  @Interval(5_000)
  async tick() {
    // Tests drive the worker explicitly through processBatch().
    if (this.env.NODE_ENV === NodeEnv.Test || this.running || this.stopped) return
    this.running = true
    try {
      await this.processBatch()
    } catch (err) {
      this.logger.error({ err }, 'Outbox batch failed')
    } finally {
      this.running = false
    }
  }

  async processBatch(): Promise<number> {
    const claimed = await this.prisma.$queryRaw<Claimed[]>`
      UPDATE "OutboxMessage"
      SET "nextAttemptAt" = now() + make_interval(secs => ${LEASE_SECONDS})
      WHERE id IN (
        SELECT id FROM "OutboxMessage"
        WHERE status = 'PENDING' AND "nextAttemptAt" <= now()
        ORDER BY "createdAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, payload, attempts`

    for (const msg of claimed) {
      const attempts = msg.attempts + 1
      try {
        await this.mail.send(render(msg.payload))
        await this.prisma.outboxMessage.update({
          where: { id: msg.id },
          data: { status: 'SENT', attempts, processedAt: new Date(), lastError: null },
        })
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Outbox ${msg.id} attempt ${attempts} failed: ${error}`)
        await this.prisma.outboxMessage.update({
          where: { id: msg.id },
          data: {
            status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
            attempts,
            lastError: error.slice(0, 1000),
            nextAttemptAt: new Date(Date.now() + backoff(attempts)),
          },
        })
      }
    }
    return claimed.length
  }
}
