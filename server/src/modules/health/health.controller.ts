import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'

import { PrismaService } from '../../prisma/prisma.service'

/** Probes for orchestrators: /api/health (alive) and /api/health/ready (can serve traffic). */
@ApiTags('Служебное')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness: процесс жив' })
  live() {
    return { status: 'ok' }
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness: есть связь с базой данных' })
  ready() {
    return this.health.check([() => this.db.pingCheck('database', this.prisma, { timeout: 1500 })])
  }
}
