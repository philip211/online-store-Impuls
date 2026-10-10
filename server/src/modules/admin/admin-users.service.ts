import { Injectable } from '@nestjs/common'

import type { Prisma } from '../../../generated/prisma/client'
import { type PaginationQueryDto, page } from '../../common/dto/pagination.dto'
import { ErrorCode, notFound, unprocessable } from '../../common/errors'
import { PrismaService } from '../../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { AuthService, toUserDto } from '../auth/auth.service'
import type { AdminUsersQueryDto, ChangeRoleDto } from './dto/admin.dto'

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async list(q: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}),
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q.toLowerCase() } },
              { name: { contains: q.q, mode: 'insensitive' } },
              { phone: { contains: q.q.replace(/\D/g, '') || q.q } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
    ])
    return page(rows.map(toUserDto), total, q)
  }

  /** The shop never ends up without an administrator. Sessions of the user are ended. */
  async changeRole(actorId: string, userId: string, dto: ChangeRoleDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw notFound('Пользователь не найден')
      if (user.role === 'ADMIN' && dto.role !== 'ADMIN') {
        // Lock every admin row: two admins demoting each other at once must not both win.
        const admins = (
          await tx.$queryRaw<
            { id: string }[]
          >`SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE`
        ).length
        if (admins <= 1)
          throw unprocessable(ErrorCode.Conflict, 'Нельзя снять роль с последнего администратора')
      }
      const result = await tx.user.update({ where: { id: userId }, data: { role: dto.role } })
      await this.audit.log(
        {
          actorId,
          action: 'user.role',
          entity: 'User',
          entityId: userId,
          data: { from: user.role, to: dto.role },
        },
        tx,
      )
      return result
    })
    // New role, new token: the user signs in again and gets claims that match.
    await this.auth.revokeAll(userId)
    return toUserDto(updated)
  }

  async auditLog(q: PaginationQueryDto) {
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        include: { actor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.auditLog.count(),
    ])
    const items = rows.map(({ actor, ...e }) => ({ ...e, actorEmail: actor?.email ?? null }))
    return page(items, total, q)
  }
}
