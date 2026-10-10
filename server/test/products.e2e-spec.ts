import sharp from 'sharp'

import { createApp, loginAdmin, registerUser, type TestApp } from './app'

/** A plain 1000×800 test photo. */
const photo = (r: number, g: number, b: number) =>
  sharp({ create: { width: 1000, height: 800, channels: 3, background: { r, g, b } } })
    .png()
    .toBuffer()

describe('Adding products in the admin panel', () => {
  let t: TestApp
  let admin: string

  beforeAll(async () => {
    t = await createApp()
    admin = await loginAdmin(t.http)
  })
  afterAll(() => t.app.close())

  const upload = async (file: Buffer, token = admin) =>
    t
      .http()
      .post('/api/v1/admin/media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, 'photo.png')

  it('turns an upload into the catalogue formats', async () => {
    const res = await upload(await photo(30, 30, 32))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      // The largest encoded width, as in the media pipeline (no upscaling to 1200).
      width: 800,
      height: 640,
      widths: [160, 320, 480, 800],
      tone: 'dark',
      dominant: '#1e1e20',
    })
    expect(res.body.path).toMatch(/^products\/[0-9a-f-]{36}\/$/)
    expect(res.body.placeholder).toMatch(/^data:image\/webp;base64,/)

    const file = await t.http().get(`/api/uploads/${res.body.path}480.avif`).expect(200)
    expect(file.headers['content-type']).toBe('image/avif')
    expect(file.headers['cache-control']).toContain('immutable')
  })

  it('refuses files that are not images and customers', async () => {
    const fake = await upload(Buffer.from('<?php echo 1; ?>'))
    expect(fake.status).toBe(422)
    const tiny = await upload(
      await sharp({ create: { width: 100, height: 100, channels: 3, background: '#fff' } })
        .png()
        .toBuffer(),
    )
    expect(tiny.status).toBe(422)
    const customer = await registerUser(t.http)
    expect((await upload(await photo(1, 2, 3), customer.token)).status).toBe(403)
  })

  it('creates a product that appears in the storefront with its photos', async () => {
    const shot = (await upload(await photo(220, 220, 215))).body
    const body = {
      slug: 'nothing-ear-3',
      categoryId: 'sound',
      kind: 'Беспроводные наушники',
      name: 'Nothing Ear (3)',
      brand: 'Nothing',
      price: 15_990,
      oldPrice: 17_990,
      stock: 5,
      colors: [{ name: 'Белый', hex: '#f2f2ef' }],
      optionLabel: 'Комплект',
      options: ['Наушники с кейсом'],
      description: 'Прозрачный корпус, шумоподавление и шесть часов музыки.',
      specs: [{ label: 'Работа от батареи', value: 'до 6 часов' }],
      tags: ['tws', 'прозрачные'],
      dimensions: { size: '5 × 6 × 2,5 см', weight: '58 г', compare: 'как спичечный коробок' },
      images: [
        {
          path: shot.path,
          role: 'primary',
          color: 'Белый',
          alt: 'Белые Nothing Ear (3) на светлом фоне',
          focal: '50% 50%',
          tone: shot.tone,
          width: shot.width,
          height: shot.height,
          widths: shot.widths,
          placeholder: shot.placeholder,
          dominant: shot.dominant,
        },
      ],
    }
    const created = await t
      .http()
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${admin}`)
      .send(body)
      .expect(201)
    expect(created.body.photos[0]).toMatchObject({ path: shot.path, role: 'primary' })
    expect(created.body.photos[0].credit).toBeUndefined()

    const storefront = await t.http().get('/api/v1/products/nothing-ear-3').expect(200)
    expect(storefront.body).toMatchObject({ inStock: true, price: 15_990, categoryName: 'Звук' })
    expect(storefront.body.images[0].credit).toBeNull()
    expect(storefront.body.images[0].src).toBe(`/api/uploads/${shot.path}800.webp`)

    // The same slug twice is a conflict, and a photo colour must be one of the product's.
    await t
      .http()
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${admin}`)
      .send(body)
      .expect(409)
    const wrongColor = await t
      .http()
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...body, slug: 'nothing-ear-3b', images: [{ ...body.images[0], color: 'Синий' }] })
      .expect(400)
    expect(wrongColor.body.errors[0].field).toBe('images.0.color')
  })

  it('requires at least one photo and refuses paths that were never uploaded', async () => {
    const base = {
      slug: 'no-photo',
      categoryId: 'desk',
      kind: 'Мышь',
      name: 'Без фото',
      brand: 'Test',
      price: 1000,
      stock: 1,
      colors: [{ name: 'Чёрный', hex: '#000000' }],
      optionLabel: 'Комплект',
      options: ['Мышь'],
      description: '',
      specs: [],
      dimensions: { size: '1', weight: '1', compare: '1' },
    }
    const none = await t
      .http()
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${admin}`)
      .send(base)
      .expect(400)
    expect(none.body.errors[0].field).toBe('images')

    const ghost = await t
      .http()
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        ...base,
        images: [
          {
            path: 'products/00000000-0000-0000-0000-000000000000/',
            role: 'primary',
            color: 'Чёрный',
            alt: 'x',
            focal: '50% 50%',
            tone: 'mid',
            width: 800,
            height: 800,
            widths: [800],
            placeholder: 'data:image/webp;base64,AA==',
            dominant: '#000000',
          },
        ],
      })
      .expect(400)
    expect(ghost.body.errors[0].field).toBe('images.0.path')
  })

  it('changes only the fields a PATCH sends, and never stock', async () => {
    const before = await t.prisma.product.findUniqueOrThrow({
      where: { slug: 'sony-wh-1000xm5' },
      include: { images: true },
    })
    const auth = { Authorization: `Bearer ${admin}` }
    await t
      .http()
      .patch(`/api/v1/admin/products/${before.id}`)
      .set(auth)
      .send({ price: before.price + 1000 })
      .expect(200)
    const after = await t.prisma.product.findUniqueOrThrow({
      where: { id: before.id },
      include: { images: true },
    })
    expect(after.price).toBe(before.price + 1000)
    expect(after.images).toHaveLength(before.images.length)
    expect(after.tags).toEqual(before.tags)
    expect(after.popularity).toBe(before.popularity)

    // Stock only moves through /stock (row-locked), and an empty photo list is refused.
    await t
      .http()
      .patch(`/api/v1/admin/products/${before.id}`)
      .set(auth)
      .send({ stock: 1 })
      .expect(400)
    await t
      .http()
      .patch(`/api/v1/admin/products/${before.id}`)
      .set(auth)
      .send({ images: [] })
      .expect(400)
    await t
      .http()
      .patch(`/api/v1/admin/products/${before.id}`)
      .set(auth)
      .send({ price: before.price })
      .expect(200)
  })
})
