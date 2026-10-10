import { randomUUID } from 'node:crypto'

import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { hash, verify } from 'argon2'

import type { User } from '../../../generated/prisma/client'
import { AppException, conflict, ErrorCode, ValidationException } from '../../common/errors'
import { randomToken, sha256 } from '../../common/lib/crypto'
import { normalizePhone } from '../../common/lib/phone'
import { Env } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import type { LoginDto, RegisterDto, UserDto } from './dto/auth.dto'

export type ClientMeta = { ip?: string; userAgent?: string }

export type IssuedTokens = {
  accessToken: string
  expiresIn: number
  refreshToken: string
  refreshExpiresAt: Date
  user: UserDto
}

const DAY_MS = 86_400_000
/** A just-rotated refresh token is still accepted this long (parallel tabs, retries). */
const REUSE_LEEWAY_MS = 30_000

/** "15m", "1h", "900" → seconds. */
function parseTtl(ttl: string): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec(ttl.trim())
  if (!m) throw new Error(`Bad JWT_ACCESS_TTL: ${ttl}`)
  const unit = { '': 1, s: 1, m: 60, h: 3600, d: 86_400 }[m[2] as '' | 's' | 'm' | 'h' | 'd']
  return Number(m[1]) * unit
}

export const toUserDto = (u: User): UserDto => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
})

const invalidCredentials = () =>
  new AppException(
    HttpStatus.UNAUTHORIZED,
    ErrorCode.InvalidCredentials,
    'Неверная почта или пароль',
  )

const invalidRefresh = () =>
  new AppException(
    HttpStatus.UNAUTHORIZED,
    ErrorCode.InvalidRefreshToken,
    'Сессия истекла, войдите снова',
  )

/**
 * Accounts and sessions.
 * - Passwords: argon2id (OWASP recommendation), never logged or returned.
 * - Access token: short-lived JWT in memory on the client.
 * - Refresh token: opaque random string in an httpOnly cookie, stored hashed; rotated on every
 *   use. Presenting an already-rotated token revokes the whole family: someone copied it.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly accessTtl: number
  /** Verified against when the email is unknown, so timing does not reveal registered emails. */
  private dummyHash: Promise<string> | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly env: Env,
  ) {
    this.accessTtl = parseTtl(env.JWT_ACCESS_TTL)
  }

  async register(dto: RegisterDto, meta: ClientMeta): Promise<IssuedTokens> {
    const phone = dto.phone ? normalizePhone(dto.phone) : null
    if (dto.phone && !phone) {
      throw new ValidationException([
        { field: 'phone', message: 'Нужен российский номер из 11 цифр' },
      ])
    }
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    })
    if (exists) throw conflict(ErrorCode.EmailTaken, 'Аккаунт с этой почтой уже есть — войдите')

    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, phone, passwordHash: await hash(dto.password) },
    })
    return this.issue(user, randomUUID(), meta)
  }

  async login(dto: LoginDto, meta: ClientMeta): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) {
      await verify(await this.getDummyHash(), dto.password).catch(() => false)
      throw invalidCredentials()
    }
    if (!(await verify(user.passwordHash, dto.password))) throw invalidCredentials()
    return this.issue(user, randomUUID(), meta)
  }

  async refresh(token: string | undefined, meta: ClientMeta): Promise<IssuedTokens> {
    if (!token) throw invalidRefresh()
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    })
    if (!session) throw invalidRefresh()

    if (session.expiresAt <= new Date()) throw invalidRefresh()
    if (session.revokedAt) {
      // Ended by logout or a password change: simply invalid.
      if (!session.replacedById) throw invalidRefresh()
      // Rotated moments ago: two tabs (or a retried request) refreshed with the same cookie.
      // Benign, so the family lives on and this caller gets its own fresh token.
      // Only while its replacement is alive: after logout, a password or role change every
      // session is revoked, and an old cookie must not bring the account back.
      if (Date.now() - session.revokedAt.getTime() < REUSE_LEEWAY_MS) {
        const replacement = await this.prisma.session.findUnique({
          where: { id: session.replacedById },
          select: { revokedAt: true },
        })
        if (!replacement || replacement.revokedAt) throw invalidRefresh()
        return this.issue(session.user, session.familyId, meta)
      }
      // A long-rotated token came back: someone copied it. End every session in the family.
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      this.logger.warn(`Refresh token reuse for user ${session.userId}, family revoked`)
      throw invalidRefresh()
    }

    const issued = await this.issue(session.user, session.familyId, meta)
    // Conditional: if a parallel request rotated this token first, ours still stands as a
    // sibling in the family (the leeway case above, just simultaneous).
    await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: issued.sessionId },
    })
    return issued
  }

  async logout(token: string | undefined) {
    if (!token) return
    await this.prisma.session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  /** Ends every session of the user, e.g. after a password change. */
  async revokeAll(userId: string, exceptSessionTokenHash?: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionTokenHash ? { NOT: { tokenHash: exceptSessionTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    })
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!(await verify(user.passwordHash, current))) {
      throw new ValidationException([
        { field: 'currentPassword', message: 'Текущий пароль не подходит' },
      ])
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(next) },
    })
    await this.revokeAll(userId)
  }

  private async issue(user: User, familyId: string, meta: ClientMeta) {
    const refreshToken = randomToken(48)
    const refreshExpiresAt = new Date(Date.now() + this.env.REFRESH_TTL_DAYS * DAY_MS)
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        ip: meta.ip?.slice(0, 64),
        userAgent: meta.userAgent?.slice(0, 256),
      },
    })
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: this.env.JWT_ACCESS_SECRET, expiresIn: this.accessTtl, algorithm: 'HS256' },
    )
    return {
      accessToken,
      expiresIn: this.accessTtl,
      refreshToken,
      refreshExpiresAt,
      sessionId: session.id,
      user: toUserDto(user),
    }
  }

  private getDummyHash() {
    this.dummyHash ??= hash(randomToken())
    return this.dummyHash
  }
}
