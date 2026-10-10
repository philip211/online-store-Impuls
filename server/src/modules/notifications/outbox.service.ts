import { Injectable } from '@nestjs/common'

import type { Prisma } from '../../../generated/prisma/client'
import { PrismaService, type Tx } from '../../prisma/prisma.service'
import type { MailMessage } from './templates'

const toRow = (m: MailMessage) => ({
  type: m.type,
  payload: m as unknown as Prisma.InputJsonValue,
})

/**
 * Queues emails in the outbox table. Pass the transaction that changes the data the email is
 * about: the email is then sent if and only if that change commits.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(message: MailMessage, tx: Tx = this.prisma) {
    await tx.outboxMessage.create({ data: toRow(message) })
  }

  async enqueueMany(messages: MailMessage[], tx: Tx = this.prisma) {
    if (messages.length) await tx.outboxMessage.createMany({ data: messages.map(toRow) })
  }
}
