import { createApp, type TestApp } from './app'

describe('Catalogue API', () => {
  let t: TestApp

  beforeAll(async () => {
    t = await createApp()
  })
  afterAll(() => t.app.close())

  it('lists the catalogue with filters from the storefront URL', async () => {
    const active = await t.prisma.product.count({ where: { isActive: true } })
    const all = await t.http().get('/api/v1/products').expect(200)
    expect(all.body.total).toBe(active)
    expect(all.headers['cache-control']).toContain('max-age')

    const res = await t
      .http()
      .get('/api/v1/products')
      .query({ q: 'наушники до 30000', sort: 'price-asc' })
      .expect(200)
    const prices = res.body.items.map((p: { price: number }) => p.price)
    expect(prices.length).toBeGreaterThan(0)
    expect(prices.every((p: number) => p <= 30_000)).toBe(true)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('finds products despite the wrong keyboard layout and offers a correction', async () => {
    const layout = await t.http().get('/api/v1/products/search').query({ q: 'ыщтн' }).expect(200)
    expect(layout.body.products[0].brand).toBe('Sony')

    const typo = await t.http().get('/api/v1/products/search').query({ q: 'наушнеки' }).expect(200)
    expect(typo.body.correctedQuery).toBe('наушники')
  })

  it('counts facets against the other active filters', async () => {
    const res = await t
      .http()
      .get('/api/v1/products/facets')
      .query({ category: 'sound' })
      .expect(200)
    expect(res.body.category.all).toBe(await t.prisma.product.count({ where: { isActive: true } }))
    expect(res.body.total).toBe(res.body.category.sound)
  })

  it('serves product pages, similar products, home blocks and categories', async () => {
    const product = await t.http().get('/api/v1/products/sony-wh-1000xm5').expect(200)
    expect(product.body).toMatchObject({
      slug: 'sony-wh-1000xm5',
      category: 'sound',
      inStock: true,
    })
    expect(product.body.images[0].sources[0].srcSet).toMatch(/^\/media\/sony-wh-1000xm5\//)

    const similar = await t.http().get('/api/v1/products/sony-wh-1000xm5/similar').expect(200)
    expect(similar.body).toHaveLength(4)
    expect(similar.body.every((p: { slug: string }) => p.slug !== 'sony-wh-1000xm5')).toBe(true)

    const featured = await t.http().get('/api/v1/products/featured').expect(200)
    expect(featured.body.map((p: { id: number }) => p.id)).toEqual([7, 2, 14, 23])

    const categories = await t.http().get('/api/v1/categories').expect(200)
    expect(categories.body.map((c: { id: string }) => c.id)).toEqual([
      'sound',
      'mobile',
      'photo',
      'desk',
    ])
  })

  it('looks products up by ids, keeping the order and dropping unknown ones', async () => {
    const res = await t.http().get('/api/v1/products/lookup').query({ ids: '14,999,2' }).expect(200)
    expect(res.body.map((p: { id: number }) => p.id)).toEqual([14, 2])
  })

  it('answers errors as RFC 9457 problem details', async () => {
    const missing = await t.http().get('/api/v1/products/no-such-product').expect(404)
    expect(missing.headers['content-type']).toContain('application/problem+json')
    expect(missing.body).toMatchObject({ status: 404, code: 'NOT_FOUND' })
    expect(missing.headers['cache-control']).toBe('no-store')

    const invalid = await t
      .http()
      .get('/api/v1/products')
      .query({ maxPrice: -1, junk: 1 })
      .expect(400)
    expect(invalid.body.code).toBe('VALIDATION_FAILED')
    expect(invalid.body.errors.map((e: { field: string }) => e.field)).toEqual(
      expect.arrayContaining(['maxPrice', 'junk']),
    )
  })

  it('serves published reviews of a section', async () => {
    const res = await t
      .http()
      .get('/api/v1/reviews')
      .query({ category: 'sound', sort: 'new' })
      .expect(200)
    expect(res.body).toHaveLength(5)
    const dates = res.body.map((r: { date: string }) => r.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('reports health', async () => {
    await t.http().get('/api/health').expect(200, { status: 'ok' })
    const ready = await t.http().get('/api/health/ready').expect(200)
    expect(ready.body.info.database.status).toBe('up')
  })
})
