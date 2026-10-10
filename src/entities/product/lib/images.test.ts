import { PRODUCTS } from '../api/mock-db'
import { MEDIA, MEDIA_WIDTHS } from '../api/media.generated'
import type { GeneratedPhoto, ProductImage } from '../model/types'
import { getImage, joinPhotos } from './images'

const photo = (over: Partial<GeneratedPhoto> & Pick<GeneratedPhoto, 'n'>): GeneratedPhoto => ({
  role: 'gallery',
  color: 'Чёрный',
  alt: 'Фото',
  focal: '50% 50%',
  tone: 'mid',
  credit: { author: 'Автор', authorUrl: 'https://a', sourceUrl: 'https://s', id: 'x' },
  width: 1600,
  height: 1067,
  widths: [480, 800, 1200, 1600],
  placeholder: 'data:image/webp;base64,AAAA',
  dominant: '#777777',
  ...over,
})

describe('joinPhotos', () => {
  const [img] = joinPhotos('demo', [photo({ n: 2, role: 'primary' })], '/shop/')

  it('builds AVIF then WebP srcsets for every width under the base path', () => {
    expect(img!.id).toBe('demo/2')
    expect(img!.sources).toEqual([
      {
        type: 'image/avif',
        srcSet:
          '/shop/media/demo/2-480.avif 480w, /shop/media/demo/2-800.avif 800w, /shop/media/demo/2-1200.avif 1200w, /shop/media/demo/2-1600.avif 1600w',
      },
      {
        type: 'image/webp',
        srcSet:
          '/shop/media/demo/2-480.webp 480w, /shop/media/demo/2-800.webp 800w, /shop/media/demo/2-1200.webp 1200w, /shop/media/demo/2-1600.webp 1600w',
      },
    ])
  })

  it('falls back to a mid-size WebP and keeps the editorial data', () => {
    expect(img!.src).toBe('/shop/media/demo/2-800.webp')
    expect(img).toMatchObject({ role: 'primary', width: 1600, height: 1067, focal: '50% 50%' })
    expect(img).not.toHaveProperty('n')
    expect(img).not.toHaveProperty('widths')
  })

  it('uses the largest width when a small original never reached 800px', () => {
    const [small] = joinPhotos('demo', [photo({ n: 1, widths: [480, 640] })])
    expect(small!.src).toBe('/media/demo/1-640.webp')
  })
})

describe('getImage', () => {
  const images = joinPhotos('demo', [
    photo({ n: 1, role: 'primary', color: 'Чёрный' }),
    photo({ n: 2, role: 'gallery', color: 'Чёрный' }),
    photo({ n: 3, role: 'gallery', color: 'Серебристый' }),
    photo({ n: 4, role: 'context', color: 'Чёрный' }),
  ])
  const id = (img: ProductImage | null) => img?.id

  it('returns the primary photo by default', () => {
    expect(id(getImage({ images }))).toBe('demo/1')
  })

  it('picks by role', () => {
    expect(id(getImage({ images }, { role: 'context' }))).toBe('demo/4')
    expect(id(getImage({ images }, { role: 'gallery' }))).toBe('demo/2')
  })

  it('puts the colour first, then the role, preferring the primary on a tie', () => {
    expect(id(getImage({ images }, { color: 'Серебристый' }))).toBe('demo/3')
    expect(id(getImage({ images }, { role: 'context', color: 'Серебристый' }))).toBe('demo/3')
    expect(id(getImage({ images }, { color: 'Чёрный' }))).toBe('demo/1')
    expect(id(getImage({ images }, { role: 'gallery', color: 'Чёрный' }))).toBe('demo/2')
  })

  it('falls back to the primary when nothing matches', () => {
    expect(id(getImage({ images }, { color: 'Розовый' }))).toBe('demo/1')
    expect(id(getImage({ images: images.slice(0, 1) }, { role: 'context' }))).toBe('demo/1')
  })

  it('is null only for a product without photos', () => {
    expect(getImage({ images: [] })).toBeNull()
  })
})

describe('catalogue photos (manifest join)', () => {
  it('gives every product photos with exactly one primary', () => {
    for (const p of PRODUCTS) {
      expect(p.images.length, p.slug).toBeGreaterThan(0)
      expect(
        p.images.filter((img) => img.role === 'primary'),
        p.slug,
      ).toHaveLength(1)
    }
  })

  it('has no generated photos for products that are not in the catalogue', () => {
    expect(Object.keys(MEDIA).sort()).toEqual(PRODUCTS.map((p) => p.slug).sort())
  })

  it('labels each photo with one of the product colours and real alt text', () => {
    for (const p of PRODUCTS) {
      const colors = p.colors.map((c) => c.name)
      for (const img of p.images) {
        expect(colors, img.id).toContain(img.color)
        expect(img.alt.length, img.id).toBeGreaterThan(20)
        expect(img.focal, img.id).toMatch(/^\d{1,3}% \d{1,3}%$/)
        expect(img.dominant, img.id).toMatch(/^#[0-9a-f]{6}$/)
        expect(img.placeholder, img.id).toMatch(/^data:image\/webp;base64,/)
        expect(img.credit?.sourceUrl, img.id).toMatch(/^https:\/\/unsplash\.com\/photos\//)
      }
    }
  })

  it('points every srcset entry at a file that exists in public/', () => {
    // Lazy glob: lists the files without loading them.
    const files = new Set(Object.keys(import.meta.glob('/public/media/**/*.{avif,webp}')))
    for (const p of PRODUCTS) {
      for (const img of p.images) {
        for (const source of img.sources) {
          for (const entry of source.srcSet.split(', ')) {
            const [url, w] = entry.split(' ')
            expect(
              MEDIA_WIDTHS.map((x) => `${x}w`),
              img.id,
            ).toContain(w)
            expect(files.has(`/public${url}`), url).toBe(true)
          }
        }
      }
    }
  })
})
