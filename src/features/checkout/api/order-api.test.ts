import { CHECKOUT_DEFAULTS } from '../model/schema'
import { isPlacedOrder, placeOrder } from './order-api'

const response = {
  number: 'IM-123456',
  name: 'Анна',
  phone: '+7 900 123-45-67',
  total: 1000,
  shipping: 'courier',
  payment: 'card',
  deliveryFrom: '2026-10-11T10:00:00.000Z',
  deliveryTo: '2026-10-12T10:00:00.000Z',
  gift: true,
  accessKey: 'secret',
  status: 'PENDING_PAYMENT',
  paymentInfo: { status: 'PENDING', confirmationUrl: 'https://pay.example/1' },
}

describe('placeOrder', () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(response), { status: 201 })),
  )
  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  const req = {
    customer: { ...CHECKOUT_DEFAULTS, name: ' Анна ', phone: '+7 900 123-45-67', gift: true },
    lines: [],
    total: 1000,
  }
  const keyOf = (call: number) =>
    (fetchMock.mock.calls[call] as unknown as [string, RequestInit])[1].headers as Record<
      string,
      string
    >

  it('returns a serialisable order with the payment link', async () => {
    const order = await placeOrder(req)
    expect(order).toMatchObject({
      id: 'IM-123456',
      name: 'Анна',
      paymentUrl: 'https://pay.example/1',
    })
    expect(isPlacedOrder(structuredClone(order))).toBe(true)
  })

  it('reuses the Idempotency-Key when the same order is resent after a failure', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('offline')))
    await expect(placeOrder(req)).rejects.toThrow('offline')
    await placeOrder(req)
    expect(keyOf(0)['Idempotency-Key']).toBe(keyOf(1)['Idempotency-Key'])

    await placeOrder({ ...req, total: 2000 })
    expect(keyOf(2)['Idempotency-Key']).not.toBe(keyOf(1)['Idempotency-Key'])
  })
})

describe('isPlacedOrder', () => {
  it('rejects foreign or partial state', () => {
    expect(isPlacedOrder(null)).toBe(false)
    expect(isPlacedOrder({ id: 'IM-1', total: 10 })).toBe(false)
    expect(
      isPlacedOrder({
        id: 'IM-1',
        name: 'А',
        phone: '+7',
        total: 1,
        shipping: 'courier',
        payment: 'card',
        deliveryFrom: 'not a date',
        deliveryTo: 'not a date',
        gift: false,
      }),
    ).toBe(false)
  })
})
