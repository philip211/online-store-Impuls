import { createApp, loginAdmin, registerUser, type TestApp } from './app'

describe('Accounts and access control', () => {
  let t: TestApp

  beforeAll(async () => {
    t = await createApp()
  })
  afterAll(() => t.app.close())

  it('registers with a strong password and a unique email', async () => {
    const weak = await t
      .http()
      .post('/api/v1/auth/register')
      .send({ email: 'weak@test.ru', password: 'password', name: 'А' })
      .expect(400)
    expect(weak.body.errors[0].field).toBe('password')

    const user = await registerUser(t.http)
    const dup = await t
      .http()
      .post('/api/v1/auth/register')
      .send({ email: user.email.toUpperCase(), password: 'secret123', name: 'Б' })
      .expect(409)
    expect(dup.body.code).toBe('EMAIL_TAKEN')
  })

  it('sets the refresh token as an httpOnly cookie scoped to the auth routes', async () => {
    const res = await t
      .http()
      .post('/api/v1/auth/register')
      .send({ email: `cookie-${Date.now()}@test.ru`, password: 'secret123', name: 'В' })
      .expect(201)
    const cookie = String(res.headers['set-cookie'])
    expect(cookie).toContain('impulse_rt=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Path=/api/v1/auth')
    expect(cookie).toContain('SameSite=Strict')
    expect(res.body.refreshToken).toBeUndefined()
  })

  it('does not tell whether an email is registered', async () => {
    const user = await registerUser(t.http)
    const wrongPassword = await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'nope12345' })
      .expect(401)
    const unknown = await t
      .http()
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@test.ru', password: 'nope12345' })
      .expect(401)
    expect(wrongPassword.body.detail).toBe(unknown.body.detail)
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('rotates refresh tokens and revokes the family when an old one is replayed', async () => {
    const user = await registerUser(t.http)
    const first = await t.http().post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(200)
    const rotated = String(first.headers['set-cookie']?.[0]).split(';')[0]!
    expect(rotated).not.toBe(user.cookie)

    // Right after rotation the old cookie still works: another tab refreshed at the same time.
    await t.http().post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(200)

    // Long after rotation it is treated as stolen…
    await t.prisma.session.updateMany({
      where: { userId: user.id, replacedById: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    })
    const replay = await t
      .http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', user.cookie)
      .expect(401)
    expect(replay.body.code).toBe('INVALID_REFRESH_TOKEN')
    // …and the legitimate new one is revoked with it.
    await t.http().post('/api/v1/auth/refresh').set('Cookie', rotated).expect(401)
  })

  it('answers a refresh without a cookie with 204: a guest, not an error', async () => {
    await t.http().post('/api/v1/auth/refresh').expect(204)
  })

  it('does not revive a session through the reuse window after a password change', async () => {
    const user = await registerUser(t.http)
    await t.http().post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(200)
    await t
      .http()
      .post('/api/v1/me/password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ currentPassword: 'secret123', newPassword: 'another456' })
      .expect(204)
    await t.http().post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(401)
  })

  it('logs out by revoking the session', async () => {
    const user = await registerUser(t.http)
    await t.http().post('/api/v1/auth/logout').set('Cookie', user.cookie).expect(204)
    await t.http().post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(401)
  })

  it('protects account routes and keeps the cart and wishlist per user', async () => {
    await t.http().get('/api/v1/me').expect(401)
    await t.http().get('/api/v1/me').set('Authorization', 'Bearer forged.token.here').expect(401)

    const user = await registerUser(t.http)
    const auth = { Authorization: `Bearer ${user.token}` }
    await t.http().put('/api/v1/me/wishlist/2').set(auth).expect(204)
    await t.http().put('/api/v1/me/wishlist/2').set(auth).expect(204)
    const merged = await t
      .http()
      .post('/api/v1/me/wishlist/merge')
      .set(auth)
      .send({ productIds: [7, 999] })
      .expect(200)
    expect(merged.body.map((p: { id: number }) => p.id).sort()).toEqual([2, 7])

    const sony = (await t.http().get('/api/v1/products/sony-wh-1000xm5')).body
    const cart = await t
      .http()
      .put('/api/v1/me/cart')
      .set(auth)
      .send({
        items: [
          { productId: sony.id, colorName: sony.colors[0].name, option: sony.options[0], qty: 1 },
          { productId: sony.id, colorName: sony.colors[0].name, option: sony.options[0], qty: 2 },
          { productId: sony.id, colorName: 'Нет такого', option: sony.options[0], qty: 1 },
        ],
      })
      .expect(200)
    expect(cart.body.items).toHaveLength(1)
    expect(cart.body.items[0].qty).toBe(3)
    expect(cart.body.subtotal).toBe(sony.price * 3)

    const other = await registerUser(t.http)
    const otherCart = await t
      .http()
      .get('/api/v1/me/cart')
      .set('Authorization', `Bearer ${other.token}`)
      .expect(200)
    expect(otherCart.body.items).toEqual([])
  })

  it('limits the admin API to staff, and user management to administrators', async () => {
    const customer = await registerUser(t.http)
    await t
      .http()
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(403)

    const admin = await loginAdmin(t.http)
    await t.http().get('/api/v1/admin/stats').set('Authorization', `Bearer ${admin}`).expect(200)

    // Promote to manager: staff routes open, user management stays closed.
    await t
      .http()
      .patch(`/api/v1/admin/users/${customer.id}/role`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ role: 'MANAGER' })
      .expect(200)
    await t
      .http()
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(200)
    await t
      .http()
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${customer.token}`)
      .expect(403)

    const audit = await t
      .http()
      .get('/api/v1/admin/audit-log')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(audit.body.items[0]).toMatchObject({ action: 'user.role', entityId: customer.id })
  })

  it('lets staff manage stock and notifies the waitlist when it comes back', async () => {
    const admin = await loginAdmin(t.http)
    const auth = { Authorization: `Bearer ${admin}` }
    const product = await t.prisma.product.update({
      where: { slug: 'garmin-forerunner-55' },
      data: { stock: 0 },
    })

    await t
      .http()
      .post('/api/v1/restock-subscriptions')
      .send({ productId: product.id, email: 'wait@test.ru' })
      .expect(201)
    const res = await t
      .http()
      .patch(`/api/v1/admin/products/${product.id}/stock`)
      .set(auth)
      .send({ delta: 5 })
      .expect(200)
    expect(res.body).toMatchObject({ stock: 5, inStock: true })

    const mail = await t.prisma.outboxMessage.findFirst({
      where: { type: 'restock.available', payload: { path: ['to'], equals: 'wait@test.ru' } },
    })
    expect(mail).not.toBeNull()
    const storefront = await t.http().get('/api/v1/products/garmin-forerunner-55').expect(200)
    expect(storefront.body.inStock).toBe(true)
  })
})
