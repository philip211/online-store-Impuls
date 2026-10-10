import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'

import { type Prisma, PrismaClient } from '../../generated/prisma/client'
import { Env } from '../config/env'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}

/** Client handed to `$transaction(async (tx) => …)` callbacks. */
export type Tx = Prisma.TransactionClient
