import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import { Env } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import { AUTH_KEY, type AuthRequirement, type AuthUser, Role } from '../auth'

type AccessClaims = { sub: string; role: Role }

/**
 * Global guard. Reads the Bearer access token on every request; routes marked @Auth() demand
 * one. Staff routes re-check the role in the database, so a demoted manager loses access at
 * once rather than when the token expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true
    const req = ctx.switchToHttp().getRequest<Request>()
    const requirement = this.reflector.getAllAndOverride<AuthRequirement | undefined>(AUTH_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    const user = await this.readToken(req)
    if (user) req.user = user
    if (!requirement) return true
    if (!user) throw new UnauthorizedException()

    if (requirement.roles.length) {
      const current = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
      if (!current) throw new UnauthorizedException()
      if (!requirement.roles.includes(current.role)) throw new ForbiddenException()
      req.user = { ...user, role: current.role }
    }
    return true
  }

  private async readToken(req: Request): Promise<AuthUser | null> {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return null
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(header.slice(7), {
        secret: this.env.JWT_ACCESS_SECRET,
        algorithms: ['HS256'],
      })
      return { id: claims.sub, role: claims.role }
    } catch {
      // An expired or forged token on a public route is treated as anonymous.
      return null
    }
  }
}
