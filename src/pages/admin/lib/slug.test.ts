import { slugify } from './slug'

describe('slugify', () => {
  it('follows the catalogue style', () => {
    expect(slugify('Apple AirPods Pro 2')).toBe('apple-airpods-pro-2')
    expect(slugify('Sony WH-1000XM5')).toBe('sony-wh-1000xm5')
    expect(slugify('Apple MacBook Air 13″ (M4)')).toBe('apple-macbook-air-13-m4')
  })

  it('transliterates Cyrillic and drops accents and symbols', () => {
    expect(slugify('Умная колонка «Ёлка»')).toBe('umnaya-kolonka-elka')
    expect(slugify('Sony α7 IV')).toBe('sony-7-iv')
    expect(slugify('  --Café--  ')).toBe('cafe')
  })

  it('stays within 120 characters without a trailing dash', () => {
    const slug = slugify('a '.repeat(100))
    expect(slug.length).toBeLessThanOrEqual(120)
    expect(slug.endsWith('-')).toBe(false)
  })
})
