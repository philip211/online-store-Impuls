import { EMPTY_PRODUCT, productFormSchema, type ProductFormValues } from './product-form'

const shot = (path: string, color = 'Чёрный') => ({
  path,
  role: 'gallery' as const,
  color,
  alt: 'Фото товара',
  focal: '50% 50%',
  tone: 'mid' as const,
  width: 1600,
  height: 2000,
  widths: [160, 320, 480, 800, 1200, 1600],
  placeholder: 'data:image/webp;base64,AA==',
  dominant: '#808080',
  src: `/api/uploads/${path}800.webp`,
})

const valid: ProductFormValues = {
  ...EMPTY_PRODUCT,
  name: 'Nothing Ear (3)',
  slug: 'nothing-ear-3',
  brand: 'Nothing',
  kind: 'Наушники',
  categoryId: 'sound',
  price: '15990',
  oldPrice: '',
  stock: '5',
  options: 'Наушники с кейсом\n\n  Наушники, кейс и шнур  ',
  photos: [shot('products/a/'), shot('products/b/')],
  primary: 1,
  tags: 'tws, прозрачные, ',
}

describe('product form', () => {
  it('produces the API body: numbers, option lines, tags and the card photo role', () => {
    const out = productFormSchema.parse(valid)
    expect(out).toMatchObject({
      price: 15_990,
      oldPrice: null,
      stock: 5,
      options: ['Наушники с кейсом', 'Наушники, кейс и шнур'],
      tags: ['tws', 'прозрачные'],
      featuredRank: null,
    })
    expect(out.images.map((i) => i.role)).toEqual(['gallery', 'primary'])
    expect(out.images[0]).not.toHaveProperty('src')
  })

  it('demotes a former card photo when another one is chosen', () => {
    const out = productFormSchema.parse({
      ...valid,
      photos: [{ ...shot('products/a/'), role: 'primary' }, shot('products/b/')],
      primary: 1,
    })
    expect(out.images.map((i) => i.role)).toEqual(['gallery', 'primary'])
  })

  it('catches what a manager can get wrong', () => {
    const result = productFormSchema.safeParse({
      ...valid,
      slug: 'Nothing Ear 3',
      oldPrice: '9000',
      photos: [shot('products/a/', 'Синий')],
      primary: 0,
      colors: [
        { name: 'Чёрный', hex: '#000000' },
        { name: 'Чёрный', hex: '#111111' },
      ],
    })
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map((i) => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['slug', 'oldPrice', 'colors', 'photos.0.color']))
  })

  it('requires a photo', () => {
    const result = productFormSchema.safeParse({ ...valid, photos: [] })
    expect(result.error?.issues[0]?.path).toEqual(['photos'])
  })
})
