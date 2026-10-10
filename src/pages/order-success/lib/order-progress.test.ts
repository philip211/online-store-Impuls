import type { PlacedOrder } from '@/features/checkout'

import { deliveryWindow, nextSteps, orderSteps } from './order-progress'

/** Compare visible text: the formatter adds no-break spaces and word joiners. */
const plain = (s: string | undefined) => (s ?? '').replace(/\u00A0/g, ' ').replace(/\u2060/g, '')

const order = (over: Partial<PlacedOrder> = {}): PlacedOrder => ({
  id: 'IM-104217',
  name: 'Анна',
  phone: '+7 900 123-45-67',
  total: 10_390,
  shipping: 'courier',
  payment: 'card',
  deliveryFrom: new Date(2026, 9, 9, 12).toISOString(),
  deliveryTo: new Date(2026, 9, 10, 12).toISOString(),
  gift: false,
  ...over,
})

describe('order progress', () => {
  it('formats the promised window', () => {
    expect(plain(deliveryWindow(order()))).toBe('9–10 октября')
  })

  it('has four steps ending with the delivery date', () => {
    const steps = orderSteps(order())
    expect(steps.map((s) => s.title)).toEqual(['Принят', 'Собираем', 'В пути', 'Доставлен'])
    expect(plain(steps[3]!.note)).toBe('9–10 октября')
    expect(orderSteps(order({ shipping: 'pickup' }))[3]!.title).toBe('Ждёт в пункте выдачи')
  })

  it('tailors next steps to payment, delivery and gift', () => {
    const card = nextSteps(order())
    expect(card[0]).toContain('+7 900 123-45-67')
    expect(card.join(' ')).toMatch(/ссылку на оплату/)
    expect(card).toHaveLength(4)

    const cash = nextSteps(order({ payment: 'cash', shipping: 'pickup', gift: true }))
    expect(cash.join(' ')).toMatch(/при получении/)
    expect(cash.join(' ')).toMatch(/пункт выдачи/)
    expect(cash).toHaveLength(5)
  })
})
