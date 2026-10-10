import { Injectable } from '@nestjs/common'

import type { Prisma } from '../../../generated/prisma/client'
import { PrismaService, type Tx } from '../../prisma/prisma.service'

export type AuditEntry = {
  actorId: string
  action: string
  entity: string
  entityId: string | number
  data?: Prisma.InputJsonValue
}

/** Who changed what in the admin panel. Written in the same transaction as the change. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx: Tx = this.prisma) {
    await tx.auditLog.create({ data: { ...entry, entityId: String(entry.entityId) } })
  }
}
