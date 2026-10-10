import { validateEnv } from './env'

const base = { DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'x'.repeat(32) }

describe('validateEnv', () => {
  it('applies defaults and parses types', () => {
    const env = validateEnv({
      ...base,
      PORT: '4000',
      SWAGGER_ENABLED: 'false',
      FRONTEND_URL: 'http://a.ru/, http://b.ru',
    })
    expect(env.PORT).toBe(4000)
    expect(env.SWAGGER_ENABLED).toBe(false)
    expect(env.FRONTEND_URL).toEqual(['http://a.ru', 'http://b.ru'])
    expect(env.PAYMENT_PROVIDER).toBe('mock')
  })

  it('fails fast on a weak secret or a missing database', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/)
    expect(() => validateEnv({ JWT_ACCESS_SECRET: 'x'.repeat(32) })).toThrow(/DATABASE_URL/)
  })

  it('requires provider credentials and forbids the mock provider in production', () => {
    expect(() => validateEnv({ ...base, PAYMENT_PROVIDER: 'yookassa' })).toThrow(/YOOKASSA_SHOP_ID/)
    expect(() => validateEnv({ ...base, NODE_ENV: 'production', TRUST_PROXY: '1' })).toThrow(/mock/)
  })

  it('makes production choose TRUST_PROXY and hides the docs unless asked', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'yookassa',
      YOOKASSA_SHOP_ID: '1',
      YOOKASSA_SECRET_KEY: 'k',
    }
    expect(() => validateEnv(prod)).toThrow(/TRUST_PROXY/)
    expect(validateEnv({ ...prod, TRUST_PROXY: '0' }).SWAGGER_ENABLED).toBe(false)
    expect(
      validateEnv({ ...prod, TRUST_PROXY: '1', SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED,
    ).toBe(true)
  })
})
