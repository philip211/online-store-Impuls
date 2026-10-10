import { parseOrderNumber, toOrderStatus } from './order-status'

describe('parseOrderNumber', () => {
  it('accepts common spellings', () => {
    expect(parseOrderNumber('IM-123456')).toBe('IM-123456')
    expect(parseOrderNumber('im 123 456')).toBe('IM-123456')
    expect(parseOrderNumber('IM123456')).toBe('IM-123456')
    expect(parseOrderNumber('123456')).toBe('IM-123456')
  })

  it('rejects anything else', () => {
    expect(parseOrderNumber('')).toBeNull()
    expect(parseOrderNumber('IM-12345')).toBeNull()
    expect(parseOrderNumber('XX-123456')).toBeNull()
  })
})

describe('toOrderStatus', () => {
  it('turns the API dates into Date objects', () => {
    const status = toOrderStatus({
      number: 'IM-100003',
      method: 'courier',
      current: 1,
      steps: [
        { label: 'Оформлен', detail: '', date: '2026-10-05T09:00:00.000Z', done: true },
        { label: 'Собран на складе', detail: '', date: '2026-10-05T15:00:00.000Z', done: true },
      ],
    })
    expect(status.steps[1]!.date).toBeInstanceOf(Date)
    expect(status.steps[1]!.date.toISOString()).toBe('2026-10-05T15:00:00.000Z')
    expect(status.current).toBe(1)
  })
})
