import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Keyed hash, URL-safe. */
export const hmac = (key: string, value: string) =>
  createHmac('sha256', key).update(value).digest('base64url')

/** URL-safe random secret: 32 bytes ≈ 256 bits of entropy. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

export { randomInt }

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Stable JSON: object keys sorted, so equal payloads hash equally whatever the key order. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
