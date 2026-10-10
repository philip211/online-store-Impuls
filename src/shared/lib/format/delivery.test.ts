import { describeDelivery, estimateDelivery, formatDateRange, formatDay } from './delivery'

/** Test strings in plain spaces; the formatter adds no-break spaces and word joiners. */
const plain = (s: string) => s.replace(/\u00A0/g, ' ').replace(/\u2060/g, '')

// Wednesday, 7 October 2026, 12:00
const WED_NOON = new Date(2026, 9, 7, 12, 0)

describe('delivery estimates', () => {
  it('courier arrives in 1–2 days before the cutoff', () => {
    const { from, to } = estimateDelivery('courier', WED_NOON)
    expect([from.getDate(), to.getDate()]).toEqual([8, 9])
  })

  it('orders after 16:00 shift by a day', () => {
    const late = new Date(2026, 9, 7, 17, 0)
    const { from } = estimateDelivery('courier', late)
    expect(from.getDate()).toBe(9)
  })

  it('pickup takes a day longer', () => {
    const { from, to } = estimateDelivery('pickup', WED_NOON)
    expect([from.getDate(), to.getDate()]).toEqual([9, 10])
  })

  it('formats ranges within and across months', () => {
    expect(formatDateRange(new Date(2026, 9, 9), new Date(2026, 9, 10))).toBe(
      '9\u2060–\u206010\u00A0октября',
    )
    expect(formatDateRange(new Date(2026, 9, 31), new Date(2026, 10, 1))).toBe(
      '31\u00A0октября\u00A0– 1\u00A0ноября',
    )
  })

  it('uses relative words for near days', () => {
    expect(formatDay(new Date(2026, 9, 8), WED_NOON)).toBe('завтра')
    expect(formatDay(new Date(2026, 9, 9), WED_NOON)).toBe('послезавтра')
    expect(formatDay(new Date(2026, 9, 10), WED_NOON)).toBe('в субботу')
    expect(formatDay(new Date(2026, 9, 20), WED_NOON)).toBe('20\u00A0октября')
  })

  it('builds a readable sentence', () => {
    expect(plain(describeDelivery('courier', WED_NOON))).toBe(
      'Привезём завтра или послезавтра, 8–9 октября',
    )
    expect(plain(describeDelivery('pickup', WED_NOON))).toBe('В пункте выдачи 9–10 октября')
  })
})
