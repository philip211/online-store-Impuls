import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common'
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger'
import type { Request } from 'express'

import { Role } from '../../generated/prisma/client'

export { Role }

/** Claims carried by the access token. */
export type AuthUser = { id: string; role: Role }

export const AUTH_KEY = 'auth'
export type AuthRequirement = { roles: Role[] }

/** Staff roles that may use the admin API. */
export const STAFF: Role[] = [Role.MANAGER, Role.ADMIN]

/**
 * Requires a signed-in user; with roles, one of them. Routes without it are public, and
 * AuthGuard still attaches the user when a valid token is sent (e.g. checkout links the
 * order to the account).
 */
export function Auth(...roles: Role[]) {
  const decorators = [
    SetMetadata(AUTH_KEY, { roles } satisfies AuthRequirement),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Нет или просрочен access-токен' }),
  ]
  if (roles.length) decorators.push(ApiForbiddenResponse({ description: 'Недостаточно прав' }))
  return applyDecorators(...decorators)
}

/** The signed-in user. Use on routes guarded by @Auth(). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<Request>().user
  if (!user) throw new Error('CurrentUser used on a route without @Auth()')
  return user
})

/** The user if a valid token was sent, otherwise undefined. For public routes. */
export const OptionalUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().user,
)
