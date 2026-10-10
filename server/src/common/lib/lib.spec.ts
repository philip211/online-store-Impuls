import { hmac, safeEqual, stableStringify } from './crypto'
import { formatPhone, normalizePhone } from './phone'

describe('phone', () => {
  it('normalizes Russian numbers to 7XXXXXXXXXX', () => {
    expect(normalizePhone('+7 (900) 123-45-67')).toBe('79001234567')
    expect(normalizePhone('8 900 123 45 67')).toBe('79001234567')
    expect(normalizePhone('900 123 45 67')).toBeNull()
    expect(normalizePhone('+1 900 123 45 67')).toBeNull()
  })

  it('formats for display', () => {
    expect(formatPhone('79001234567')).toBe('+7 900 123-45-67')
  })
})

describe('crypto helpers', () => {
  it('stringifies objects independently of key order', () => {
    expect(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(
      stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }),
    )
    expect(stableStringify({ a: undefined, b: null })).toBe('{"b":null}')
  })

  it('compares secrets safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })

  it('derives stable keyed hashes', () => {
    expect(hmac('k', 'v')).toBe(hmac('k', 'v'))
    expect(hmac('k', 'v')).not.toBe(hmac('k2', 'v'))
  })
})
