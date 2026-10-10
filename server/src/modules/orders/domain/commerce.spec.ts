import { COURIER_PRICE, FREE_SHIPPING_FROM, orderTotals } from './commerce'
import { estimateDelivery, hourIn } from './delivery'
import { generateOrderNumber, makeReturnRef, parseOrderNumber } from './order-number'

describe('orderTotals', () => {
  it('charges courier delivery below the free-shipping threshold', () => {
    expect(orderTotals('courier', 10_000)).toEqual({
      subtotal: 10_000,
      shipping: COURIER_PRICE,
      total: 10_000 + COURIER_PRICE,
    })
  })

  it('makes delivery free from the threshold and for pickup', () => {
    expect(orderTotals('courier', FREE_SHIPPING_FROM).shipping).toBe(0)
    expect(orderTotals('pickup', 100).shipping).toBe(0)
  })
})

describe('estimateDelivery', () => {
  const DAY = 86_400_000

  it('reads the hour in the shop time zone, not the server one', () => {
    // 13:00 UTC is 16:00 in Moscow.
    expect(hourIn('Europe/Moscow', new Date('2026-10-10T13:00:00Z'))).toBe(16)
  })

  it('ships a day later after the 16:00 cutoff', () => {
    const before = new Date('2026-10-10T09:00:00Z') // 12:00 MSK
    const after = new Date('2026-10-10T14:00:00Z') // 17:00 MSK
    const from = (now: Date) =>
      estimateDelivery('courier', 'Europe/Moscow', now).from.getTime() - now.getTime()
    expect(from(before)).toBe(DAY)
    expect(from(after)).toBe(2 * DAY)
    expect(
      estimateDelivery('pickup', 'Europe/Moscow', before).to.getTime() - before.getTime(),
    ).toBe(3 * DAY)
  })
})

describe('order numbers', () => {
  it('generates six-digit IM numbers', () => {
    for (let i = 0; i < 50; i++) expect(generateOrderNumber()).toMatch(/^IM-[1-9]\d{5}$/)
  })

  it('accepts the spellings shoppers type', () => {
    expect(parseOrderNumber('im 123456')).toBe('IM-123456')
    expect(parseOrderNumber('IM123456')).toBe('IM-123456')
    expect(parseOrderNumber('123456')).toBe('IM-123456')
    expect(parseOrderNumber('12345')).toBeNull()
    expect(parseOrderNumber('IM-1234567')).toBeNull()
  })

  it('builds return references from the order digits and date', () => {
    expect(makeReturnRef('IM-123456', new Date(2026, 9, 7), 42)).toBe('RT-3456-0710-42')
  })
})
