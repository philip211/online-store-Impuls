import { buildTracking, canTransition, holdsStock, nextStatuses } from './status'

describe('order status machine', () => {
  it('walks a courier order to delivery', () => {
    const path = [
      'PENDING_PAYMENT',
      'CONFIRMED',
      'ASSEMBLED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ] as const
    for (let i = 1; i < path.length; i++) {
      expect(canTransition(path[i - 1]!, path[i]!, 'courier')).toBe(true)
    }
  })

  it('sends pickup orders to the pickup point, not to a courier', () => {
    expect(canTransition('SHIPPED', 'READY_FOR_PICKUP', 'pickup')).toBe(true)
    expect(canTransition('SHIPPED', 'OUT_FOR_DELIVERY', 'pickup')).toBe(false)
    expect(nextStatuses('SHIPPED', 'courier')).toEqual(['OUT_FOR_DELIVERY', 'CANCELLED'])
  })

  it('forbids skipping steps and leaving final states', () => {
    expect(canTransition('CONFIRMED', 'DELIVERED', 'courier')).toBe(false)
    expect(canTransition('CANCELLED', 'CONFIRMED', 'courier')).toBe(false)
    expect(nextStatuses('DELIVERED', 'pickup')).toEqual([])
  })

  it('holds stock until the order is delivered or cancelled', () => {
    expect(holdsStock('PENDING_PAYMENT')).toBe(true)
    expect(holdsStock('SHIPPED')).toBe(true)
    expect(holdsStock('DELIVERED')).toBe(false)
    expect(holdsStock('CANCELLED')).toBe(false)
  })
})

describe('buildTracking', () => {
  const createdAt = new Date('2026-10-01T10:00:00Z')
  const base = {
    number: 'IM-123456',
    shippingMethod: 'courier' as const,
    createdAt,
    deliveryTo: new Date('2026-10-03T10:00:00Z'),
  }

  it('dates reached steps by their events and the last one by the promised day', () => {
    const t = buildTracking({
      ...base,
      status: 'ASSEMBLED',
      events: [
        { status: 'CONFIRMED', createdAt },
        { status: 'ASSEMBLED', createdAt: new Date('2026-10-01T15:00:00Z') },
      ],
    })
    expect(t.current).toBe(1)
    expect(t.steps.map((s) => s.done)).toEqual([true, true, false, false, false])
    expect(t.steps[1]?.date).toBe('2026-10-01T15:00:00.000Z')
    expect(t.steps[4]?.date).toBe('2026-10-03T10:00:00.000Z')
    expect(t.steps[3]?.label).toBe('У курьера')
  })

  it('shows no completed step while waiting for payment', () => {
    const t = buildTracking({
      ...base,
      status: 'PENDING_PAYMENT',
      events: [{ status: 'PENDING_PAYMENT', createdAt }],
    })
    expect(t.current).toBe(-1)
    expect(t.statusLabel).toBe('Ждёт оплаты')
  })

  it('keeps the progress of a cancelled order', () => {
    const t = buildTracking({
      ...base,
      status: 'CANCELLED',
      events: [
        { status: 'CONFIRMED', createdAt },
        { status: 'CANCELLED', createdAt },
      ],
    })
    expect(t).toMatchObject({ cancelled: true, current: 0 })
  })
})
