import { orderTotals, shippingCost } from './pricing'
import { CHECKOUT_DEFAULTS, checkoutSchema, describeInvalid, phoneIssue } from './schema'

const valid = {
  ...CHECKOUT_DEFAULTS,
  name: 'Анна',
  phone: '+7 900 123-45-67',
  address: 'Москва, Тверская 1',
}

describe('shipping', () => {
  it('charges courier below the free threshold', () => {
    expect(shippingCost('courier', 19_999)).toBe(390)
    expect(shippingCost('courier', 20_000)).toBe(0)
  })
  it('pickup is always free', () => expect(shippingCost('pickup', 100)).toBe(0))
  it('totals include shipping', () =>
    expect(orderTotals('courier', 10_000)).toEqual({
      subtotal: 10_000,
      shipping: 390,
      total: 10_390,
    }))
})

describe('phoneIssue', () => {
  it('explains why we ask when empty', () => {
    expect(phoneIssue('')).toMatch(/позвоним/)
    expect(phoneIssue('+')).toMatch(/позвоним/)
  })
  it('counts missing digits with the right plural', () => {
    expect(phoneIssue('+7 900 123-45-6')).toBe('Не хватает 1 цифры')
    expect(phoneIssue('+7 900 123-45')).toBe('Не хватает 2 цифр')
    expect(phoneIssue('+7')).toBe('Не хватает 10 цифр')
  })
  it('reports extra digits', () => {
    expect(phoneIssue('7900123456789')).toBe('В номере 2 лишние цифры')
  })
  it('accepts a full number in any formatting', () => {
    expect(phoneIssue('+7 900 123-45-67')).toBeNull()
    expect(phoneIssue('89001234567')).toBeNull()
  })
})

describe('checkoutSchema', () => {
  it('reports every missing field with the design copy', () => {
    const r = checkoutSchema.safeParse(CHECKOUT_DEFAULTS)
    expect(r.success).toBe(false)
    const messages = Object.fromEntries(r.error!.issues.map((i) => [i.path[0], i.message]))
    expect(messages.name).toBe('Напишите, как к вам обращаться')
    expect(messages.phone).toMatch(/позвоним/)
    expect(messages.address).toBe('Без адреса не довезём')
    expect(Object.keys(messages)).toHaveLength(3)
  })

  it('uses the adaptive phone message', () => {
    const r = checkoutSchema.safeParse({ ...valid, phone: '+7 900 12' })
    expect(r.error!.issues[0]!.message).toBe('Не хватает 5 цифр')
  })

  it('accepts a complete order and trims text', () => {
    const r = checkoutSchema.parse({ ...valid, name: '  Анна ', addressExtra: ' кв. 5 ' })
    expect(r.name).toBe('Анна')
    expect(r.addressExtra).toBe('кв. 5')
  })

  it('rejects whitespace-only names', () => {
    expect(checkoutSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
  })

  it('limits the gift card message to 140 characters', () => {
    const ok = checkoutSchema.safeParse({ ...valid, gift: true, giftMessage: 'а'.repeat(140) })
    expect(ok.success).toBe(true)
    const long = checkoutSchema.safeParse({ ...valid, gift: true, giftMessage: 'а'.repeat(141) })
    expect(long.error!.issues[0]!.path).toEqual(['giftMessage'])
  })
})

describe('describeInvalid', () => {
  it('names fields in form order', () => {
    expect(describeInvalid(['phone'])).toBe('Проверьте телефон')
    expect(describeInvalid(['address', 'phone'])).toBe('Проверьте телефон и адрес')
    expect(describeInvalid(['address', 'name', 'phone'])).toBe('Проверьте имя, телефон и адрес')
  })
  it('falls back to a generic message', () => {
    expect(describeInvalid([])).toBe('Проверьте поля, отмеченные красным')
    expect(describeInvalid(['root'])).toBe('Проверьте поля, отмеченные красным')
  })
})
