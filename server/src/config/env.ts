import { plainToInstance, Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator'

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const toBool = ({ value }: { value: unknown }) =>
  typeof value === 'boolean' ? value : String(value).toLowerCase() === 'true'

const toList = ({ value }: { value: unknown }) =>
  String(value)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)

/**
 * Every variable the API reads. Validated once at startup: a typo in .env fails fast with a
 * readable message instead of surfacing as a broken request hours later.
 */
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000

  @Transform(toList)
  @IsUrl({ require_tld: false }, { each: true })
  FRONTEND_URL: string[] = ['http://localhost:5173']

  @IsUrl({ require_tld: false })
  PUBLIC_API_URL = 'http://localhost:3000'

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  TRUST_PROXY = 0

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL = 'info'

  @Transform(toBool)
  @IsBoolean()
  SWAGGER_ENABLED = true

  @IsString()
  DATABASE_URL: string

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string

  @IsString()
  JWT_ACCESS_TTL = '15m'

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  REFRESH_TTL_DAYS = 30

  @IsString()
  SHOP_TIMEZONE = 'Europe/Moscow'

  @IsString()
  MEDIA_BASE_URL = '/'

  /** Where photos uploaded in the admin panel are written. */
  @IsString()
  UPLOADS_DIR = 'uploads'

  /** Public URL prefix the uploads are served from (by this API, same origin through the proxy). */
  @IsString()
  UPLOADS_BASE_URL = '/api/uploads/'

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(5)
  PAYMENT_TIMEOUT_MINUTES = 30

  @IsIn(['mock', 'yookassa'])
  PAYMENT_PROVIDER: 'mock' | 'yookassa' = 'mock'

  @IsOptional()
  @IsString()
  YOOKASSA_SHOP_ID?: string

  @IsOptional()
  @IsString()
  YOOKASSA_SECRET_KEY?: string

  @Transform(toBool)
  @IsBoolean()
  YOOKASSA_SEND_RECEIPT = false

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  YOOKASSA_VAT_CODE = 1

  @Transform(toBool)
  @IsBoolean()
  YOOKASSA_CHECK_WEBHOOK_IP = true

  @IsString()
  SMTP_HOST = 'localhost'

  @Transform(({ value }) => Number(value))
  @IsInt()
  SMTP_PORT = 1025

  @Transform(toBool)
  @IsBoolean()
  SMTP_SECURE = false

  @IsOptional()
  @IsString()
  SMTP_USER?: string

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string

  @IsString()
  MAIL_FROM = 'Импульс <hello@impulse.store>'

  @IsOptional()
  @IsEmail()
  SEED_ADMIN_EMAIL?: string

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string
}

/** Empty strings in .env mean "not set", so defaults and @IsOptional apply. */
function dropEmpty(raw: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ''))
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, dropEmpty(raw), { exposeDefaultValues: true })
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false })
  if (errors.length) {
    const lines = errors.map(
      (e) => `  ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
    )
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`)
  }
  if (env.PAYMENT_PROVIDER === 'yookassa' && (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY)) {
    throw new Error('PAYMENT_PROVIDER=yookassa requires YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY')
  }
  if (env.NODE_ENV === NodeEnv.Production) {
    // Behind a proxy without TRUST_PROXY every client shares the proxy's IP: rate limits hit
    // everyone at once and ЮKassa webhooks fail the IP check. Make the choice explicit.
    if (raw.TRUST_PROXY === undefined || raw.TRUST_PROXY === '') {
      throw new Error(
        'Set TRUST_PROXY in production: the number of proxies in front of the API (0 if none)',
      )
    }
    // API docs are opt-in in production.
    if (raw.SWAGGER_ENABLED === undefined || raw.SWAGGER_ENABLED === '') env.SWAGGER_ENABLED = false
  }
  if (env.NODE_ENV === NodeEnv.Production && env.PAYMENT_PROVIDER === 'mock') {
    throw new Error('PAYMENT_PROVIDER=mock is not allowed in production')
  }
  return env
}
