import { formatPhone, phoneDigits } from './phone'
import { formatPrice } from './format-price'
import { plural } from './plural'

const FORMS = ['товар', 'товара', 'товаров'] as const

describe('formatPrice', () => {
  it('groups thousands with non-breaking spaces', () => {
    expect(formatPrice(32990)).toBe('32\u00A0990\u00A0₽')
    expect(formatPrice(1_234_567)).toBe('1\u00A0234\u00A0567\u00A0₽')
    expect(formatPrice(390)).toBe('390\u00A0₽')
  })
})

describe('plural', () => {
  it.each([
    [1, 'товар'],
    [2, 'товара'],
    [5, 'товаров'],
    [11, 'товаров'],
    [14, 'товаров'],
    [21, 'товар'],
    [22, 'товара'],
    [111, 'товаров'],
  ])('%i → %s', (n, word) => expect(plural(n, FORMS)).toBe(word))
})

describe('formatPhone', () => {
  it('masks progressively', () => {
    expect(formatPhone('7')).toBe('+7')
    expect(formatPhone('7900')).toBe('+7 900')
    expect(formatPhone('79001234567')).toBe('+7 900 123-45-67')
  })
  it('treats a leading 8 as 7 and caps at 11 digits', () => {
    expect(formatPhone('8 (900) 123-45-67 999')).toBe('+7 900 123-45-67')
  })
  it('prefixes a missing country code', () => {
    expect(formatPhone('900')).toBe('+7 900')
  })
  it('counts digits', () => expect(phoneDigits('+7 900 123-45-67')).toHaveLength(11))
})
