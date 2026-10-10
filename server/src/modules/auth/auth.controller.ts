import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { CookieOptions, Request, Response } from 'express'

import { Env, NodeEnv } from '../../config/env'
import { AuthService, type ClientMeta, type IssuedTokens } from './auth.service'
import { AuthResponseDto, LoginDto, RegisterDto } from './dto/auth.dto'

export const REFRESH_COOKIE = 'impulse_rt'

/** Brute-force guard: per IP, on top of the global limit. */
const STRICT = { default: { limit: 10, ttl: 60_000 } }

const meta = (req: Request): ClientMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] })

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  private readonly cookie: CookieOptions

  constructor(
    private readonly auth: AuthService,
    env: Env,
  ) {
    // The refresh cookie is invisible to scripts and only ever sent to the auth routes.
    this.cookie = {
      httpOnly: true,
      secure: env.NODE_ENV === NodeEnv.Production,
      sameSite: 'strict',
      path: '/api/v1/auth',
    }
  }

  @Post('register')
  @Throttle(STRICT)
  @ApiOperation({ summary: 'Регистрация покупателя. Refresh-токен приходит в httpOnly-cookie' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.register(dto, meta(req)))
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @ApiOperation({ summary: 'Вход по почте и паролю' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.login(dto, meta(req)))
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Новый access-токен по refresh-cookie (с ротацией cookie)',
    description:
      'Без cookie — 204: гость, сессии нет. Это не ошибка, поэтому витрина спрашивает при каждом запуске.',
  })
  @ApiNoContentResponse({ description: 'Cookie нет: посетитель не входил' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto | undefined> {
    const token = this.readCookie(req)
    if (!token) {
      res.status(HttpStatus.NO_CONTENT)
      return undefined
    }
    try {
      return this.respond(res, await this.auth.refresh(token, meta(req)))
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, this.cookie)
      throw err
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Выход: сессия отзывается, cookie удаляется' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readCookie(req))
    res.clearCookie(REFRESH_COOKIE, this.cookie)
  }

  private readCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[REFRESH_COOKIE]
    return typeof value === 'string' ? value : undefined
  }

  private respond(res: Response, tokens: IssuedTokens): AuthResponseDto {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...this.cookie,
      expires: tokens.refreshExpiresAt,
    })
    res.setHeader('Cache-Control', 'no-store')
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn, user: tokens.user }
  }
}
