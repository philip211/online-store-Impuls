import type { Product, ProductImageData } from '@/entities/product'

import { buildProductJsonLd, serializeJsonLd } from './json-ld'

const PRODUCT: Product = {
  id: 1,
  slug: 'sony-wh-1000xm5',
  category: 'sound',
  kind: 'Наушники',
  name: 'Sony WH-1000XM5',
  brand: 'Sony',
  price: 32_990,
  oldPrice: 37_990,
  inStock: true,
  images: [],
  colors: [{ name: 'Чёрный', hex: '#2E323B' }],
  optionLabel: 'Комплект',
  options: ['С чехлом'],
  description: 'Накладные наушники.',
  specs: [],
  popularity: 1,
  tags: [],
  dimensions: { size: '20 × 17 × 7 см', weight: '250 г', compare: '' },
}

const ORIGIN = 'https://impulse.store'

const photo = (
  slug: string,
  n: number,
  role: ProductImageData['role'],
  widths: number[],
): ProductImageData => {
  const set = (ext: string) => widths.map((w) => `/media/${slug}/${n}-${w}.${ext} ${w}w`).join(', ')
  return {
    id: `${slug}/${n}`,
    role,
    color: 'Чёрный',
    alt: '',
    focal: '50% 50%',
    tone: 'mid',
    credit: { author: '', authorUrl: '', sourceUrl: '', id: '' },
    width: 1600,
    height: 1067,
    placeholder: '',
    dominant: '#777777',
    sources: [
      { type: 'image/avif', srcSet: set('avif') },
      { type: 'image/webp', srcSet: set('webp') },
    ],
    src: `/media/${slug}/${n}-800.webp`,
  }
}

type Node = Record<string, unknown> & { '@type': string }
const graph = (ld: ReturnType<typeof buildProductJsonLd>) => ld['@graph'] as Node[]

describe('buildProductJsonLd', () => {
  it('describes the product and its offer', () => {
    const ld = buildProductJsonLd({ product: PRODUCT, categoryName: 'Звук', origin: ORIGIN })
    const product = graph(ld).find((n) => n['@type'] === 'Product')!
    expect(product).toMatchObject({
      name: 'Sony WH-1000XM5',
      sku: 'sony-wh-1000xm5',
      brand: { name: 'Sony' },
      offers: {
        price: 32_990,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
        url: 'https://impulse.store/product/sony-wh-1000xm5',
      },
    })
    expect(product).not.toHaveProperty('aggregateRating')
  })

  it('marks out-of-stock items and adds the rating once known', () => {
    const ld = buildProductJsonLd({
      product: { ...PRODUCT, inStock: false },
      categoryName: 'Звук',
      origin: ORIGIN,
      rating: { average: 4.333, count: 6 },
    })
    const product = graph(ld).find((n) => n['@type'] === 'Product')!
    expect(product).toMatchObject({
      offers: { availability: 'https://schema.org/OutOfStock' },
      aggregateRating: { ratingValue: 4.3, reviewCount: 6 },
    })
  })

  it('takes the brand from the data, not from the name', () => {
    const ld = buildProductJsonLd({
      product: { ...PRODUCT, name: 'Kindle Paperwhite, 16 ГБ', brand: 'Amazon' },
      categoryName: 'Электронные книги',
      origin: ORIGIN,
    })
    const product = graph(ld).find((n) => n['@type'] === 'Product')!
    expect(product).toMatchObject({ brand: { '@type': 'Brand', name: 'Amazon' } })
  })

  it('lists photos as absolute 1200px WebP URLs, primary first', () => {
    const images = [
      photo('sony-wh-1000xm5', 2, 'context', [480, 800, 1200, 1600]),
      photo('sony-wh-1000xm5', 1, 'primary', [480, 800, 1200, 1600]),
      photo('sony-wh-1000xm5', 3, 'gallery', [480, 800]),
    ]
    const ld = buildProductJsonLd({
      product: { ...PRODUCT, images },
      categoryName: 'Звук',
      origin: ORIGIN,
    })
    const product = graph(ld).find((n) => n['@type'] === 'Product')!
    expect(product.image).toEqual([
      `${ORIGIN}/media/sony-wh-1000xm5/1-1200.webp`,
      `${ORIGIN}/media/sony-wh-1000xm5/2-1200.webp`,
      // A small original stops at its own largest width.
      `${ORIGIN}/media/sony-wh-1000xm5/3-800.webp`,
    ])
  })

  it('omits image when there are no photos', () => {
    const ld = buildProductJsonLd({ product: PRODUCT, categoryName: 'Звук', origin: ORIGIN })
    expect(graph(ld).find((n) => n['@type'] === 'Product')).not.toHaveProperty('image')
  })

  it('builds a three-step breadcrumb', () => {
    const ld = buildProductJsonLd({ product: PRODUCT, categoryName: 'Звук', origin: ORIGIN })
    const crumbs = graph(ld).find((n) => n['@type'] === 'BreadcrumbList')!
    expect(crumbs.itemListElement).toEqual([
      expect.objectContaining({ position: 1, name: 'Каталог' }),
      expect.objectContaining({ position: 2, name: 'Звук', item: `${ORIGIN}/catalog?cat=sound` }),
      expect.objectContaining({ position: 3, name: 'Sony WH-1000XM5' }),
    ])
  })
})

it('escapes markup in serialized JSON', () => {
  expect(serializeJsonLd({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}')
})
