import { randomUUID } from 'node:crypto'

import { PaymentsService } from '../src/modules/orders/payments/payments.service'
import { createApp, loginAdmin, orderFor, registerUser, type TestApp } from './app'

const key = () => randomUUID()

describe('Checkout and orders', () => {
  let t: TestApp

  beforeAll(async () => {
    t = await createApp()
  })
  afterAll(() => t.app.close())

  const setStock = (slug: string, stock: number) =>
    t.prisma.product.update({ where: { slug }, data: { stock } })
  const stockOf = async (slug: string) =>
    (await t.prisma.product.findUniqueOrThrow({ where: { slug } })).stock

  it('places a cash order: prices from the database, stock reserved, email queued', async () => {
    await setStock('marshall-major-iv', 5)
    const { body, product } = await orderFor(t.http, 'marshall-major-iv', {
      qty: 1,
      shipping: 'courier',
      email: 'buyer@test.ru',
    })

    const res = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    expect(res.body).toMatchObject({
      status: 'CONFIRMED',
      subtotal: product.price,
      shippingCost: 390,
      total: product.price + 390,
      phone: '+7 900 123-45-67',
      paymentInfo: null,
    })
    expect(res.body.number).toMatch(/^IM-\d{6}$/)
    expect(res.body.accessKey).toBeTruthy()
    expect(await stockOf('marshall-major-iv')).toBe(4)

    const order = await t.prisma.order.findUniqueOrThrow({ where: { number: res.body.number } })
    const mail = await t.prisma.outboxMessage.findFirst({
      where: { type: 'order.placed', payload: { path: ['number'], equals: order.number } },
    })
    expect(mail).not.toBeNull()
  })

  it('requires an Idempotency-Key and replays the same order for a repeated key', async () => {
    const { body } = await orderFor(t.http, 'apple-airpods-pro-2')
    const missing = await t.http().post('/api/v1/orders').send(body).expect(400)
    expect(missing.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

    const k = key()
    const first = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', k)
      .send(body)
      .expect(201)
    const again = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', k)
      .send(body)
      .expect(201)
    expect(again.body.number).toBe(first.body.number)
    expect(again.body.accessKey).toBe(first.body.accessKey)

    const other = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', k)
      .send({ ...body, customer: { ...body.customer, name: 'Другой' } })
      .expect(422)
    expect(other.body.code).toBe('IDEMPOTENCY_KEY_REUSED')
  })

  it('refuses an order when the price the shopper saw is outdated', async () => {
    const { body, product } = await orderFor(t.http, 'apple-airpods-pro-2')
    const stale = { ...body, lines: [{ ...body.lines[0]!, price: product.price - 1000 }] }
    const res = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(stale)
      .expect(409)
    expect(res.body.code).toBe('PRICE_CHANGED')
    expect(res.body.lines[0].price).toBe(product.price)
  })

  it('sells the last unit exactly once under concurrent checkouts', async () => {
    await setStock('ricoh-gr-iiix', 1)
    const { body } = await orderFor(t.http, 'ricoh-gr-iiix')
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        t.http().post('/api/v1/orders').set('Idempotency-Key', key()).send(body),
      ),
    )
    const statuses = results.map((r) => r.status).sort()
    expect(statuses).toEqual([201, 409, 409, 409, 409])
    expect(results.find((r) => r.status === 409)?.body.code).toBe('OUT_OF_STOCK')
    expect(await stockOf('ricoh-gr-iiix')).toBe(0)
  })

  it('rejects unknown colours and options with field errors', async () => {
    const { body } = await orderFor(t.http, 'apple-airpods-pro-2')
    const bad = {
      ...body,
      lines: [{ ...body.lines[0]!, colorName: 'Фиолетовый', option: 'Нет такого' }],
    }
    const res = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(bad)
      .expect(400)
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual([
      'lines.0.colorName',
      'lines.0.option',
    ])
  })

  it('takes a card payment through the provider and confirms the order', async () => {
    const { body } = await orderFor(t.http, 'sony-wh-1000xm5', { payment: 'card' })
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    expect(placed.body.status).toBe('PENDING_PAYMENT')
    const payUrl: string = placed.body.paymentInfo.confirmationUrl
    expect(payUrl).toContain('/api/v1/payments/mock/')

    const pay = await t
      .http()
      .post(`${new URL(payUrl).pathname}/confirm`)
      .expect(303)
    expect(pay.headers.location).toContain(`/order/success?order=${placed.body.number}`)

    const view = await t
      .http()
      .get(`/api/v1/orders/${placed.body.number}`)
      .set('X-Order-Key', placed.body.accessKey)
      .expect(200)
    expect(view.body).toMatchObject({
      status: 'CONFIRMED',
      paymentInfo: { status: 'SUCCEEDED', confirmationUrl: null },
    })

    await t
      .http()
      .get(`/api/v1/orders/${placed.body.number}`)
      .set('X-Order-Key', 'wrong')
      .expect(404)
  })

  it('cancels unpaid orders after the timeout and returns their stock', async () => {
    await setStock('fujifilm-instax-mini-evo', 2)
    const { body } = await orderFor(t.http, 'fujifilm-instax-mini-evo', { payment: 'card' })
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    expect(await stockOf('fujifilm-instax-mini-evo')).toBe(1)

    const later = new Date(Date.now() + 31 * 60_000)
    await t.app.get(PaymentsService).expireUnpaidNow(later)

    const order = await t.prisma.order.findUniqueOrThrow({ where: { number: placed.body.number } })
    expect(order.status).toBe('CANCELLED')
    expect(await stockOf('fujifilm-instax-mini-evo')).toBe(2)
  })

  it('tracks an order by number and phone without revealing others', async () => {
    const { body } = await orderFor(t.http, 'apple-airpods-pro-2')
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    const digits = placed.body.number.slice(3)

    const tr = await t
      .http()
      .post('/api/v1/orders/track')
      .send({ order: `im ${digits}`, phone: '89001234567' })
      .expect(200)
    expect(tr.body).toMatchObject({ number: placed.body.number, method: 'pickup', current: 0 })
    expect(tr.body.steps).toHaveLength(5)

    const wrong = await t
      .http()
      .post('/api/v1/orders/track')
      .send({ order: digits, phone: '89990000000' })
      .expect(404)
    expect(wrong.body.code).toBe('ORDER_NOT_FOUND')
  })

  it('lets staff move an order along the state machine only', async () => {
    const admin = await loginAdmin(t.http)
    const customer = await registerUser(t.http)
    const { body } = await orderFor(t.http, 'apple-airpods-pro-2')
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .set('Authorization', `Bearer ${customer.token}`)
      .send(body)
      .expect(201)
    const url = `/api/v1/admin/orders/${placed.body.number}/status`

    await t
      .http()
      .patch(url)
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ status: 'ASSEMBLED' })
      .expect(403)
    const skip = await t
      .http()
      .patch(url)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'DELIVERED' })
      .expect(422)
    expect(skip.body.code).toBe('INVALID_STATUS_TRANSITION')

    for (const status of ['ASSEMBLED', 'SHIPPED', 'READY_FOR_PICKUP', 'DELIVERED']) {
      await t.http().patch(url).set('Authorization', `Bearer ${admin}`).send({ status }).expect(200)
    }
    const detail = await t
      .http()
      .get(`/api/v1/admin/orders/${placed.body.number}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(detail.body.events.map((e: { status: string }) => e.status)).toEqual([
      'CONFIRMED',
      'ASSEMBLED',
      'SHIPPED',
      'READY_FOR_PICKUP',
      'DELIVERED',
    ])

    // The buyer sees it in the account, can review the product and request a return.
    const mine = await t
      .http()
      .get('/api/v1/me/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200)
    expect(mine.body.items[0].number).toBe(placed.body.number)

    const review = await t
      .http()
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ productId: body.lines[0]!.productId, rating: 4, text: 'Хорошо звучат, удобные' })
      .expect(201)
    expect(review.body.status).toBe('PENDING')

    const ret = await t
      .http()
      .post('/api/v1/returns')
      .send({ order: placed.body.number, phone: '+7 900 123-45-67', reason: 'fit' })
      .expect(201)
    expect(ret.body.ref).toMatch(/^RT-\d{4}-\d{4}-\d{2}$/)
  })

  it('cancelling a confirmed order returns its stock', async () => {
    const admin = await loginAdmin(t.http)
    await setStock('keychron-k2', 4)
    const { body } = await orderFor(t.http, 'keychron-k2', { qty: 3 })
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    expect(await stockOf('keychron-k2')).toBe(1)

    await t
      .http()
      .patch(`/api/v1/admin/orders/${placed.body.number}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'CANCELLED', comment: 'Покупатель передумал' })
      .expect(200)
    expect(await stockOf('keychron-k2')).toBe(4)
  })

  it('refunds a paid card order when staff cancel it', async () => {
    const admin = await loginAdmin(t.http)
    const { body } = await orderFor(t.http, 'apple-airpods-pro-2', { payment: 'card' })
    const placed = await t
      .http()
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send(body)
      .expect(201)
    await t
      .http()
      .post(`${new URL(placed.body.paymentInfo.confirmationUrl as string).pathname}/confirm`)
      .expect(303)

    await t
      .http()
      .patch(`/api/v1/admin/orders/${placed.body.number}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'CANCELLED' })
      .expect(200)
    const order = await t.prisma.order.findUniqueOrThrow({
      where: { number: placed.body.number },
      include: { payments: true },
    })
    expect(order.payments.map((p) => p.status)).toEqual(['REFUNDED'])
  })
})
