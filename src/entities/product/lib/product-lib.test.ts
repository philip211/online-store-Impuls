import { PRODUCTS } from '../api/mock-db'
import { DEFAULT_FILTERS } from '../model/catalog'
import { discountLabel, discountPercent, isOnSale } from './pricing'
import { applyFilters, pickSimilar } from './query'

describe('pricing', () => {
  it('computes discount from the old price', () => {
    const p = { price: 32_990, oldPrice: 37_990 }
    expect(isOnSale(p)).toBe(true)
    expect(discountPercent(p)).toBe(13)
    expect(discountLabel(p)).toBe('−13%')
  })
  it('is not on sale without an old price', () => {
    expect(isOnSale({ price: 100, oldPrice: null })).toBe(false)
    expect(discountPercent({ price: 100, oldPrice: null })).toBe(0)
  })
})

describe('applyFilters', () => {
  it('returns everything by popularity by default', () => {
    const list = applyFilters(PRODUCTS, DEFAULT_FILTERS)
    expect(list).toHaveLength(PRODUCTS.length)
    const pops = list.map((p) => p.popularity)
    expect(pops).toEqual([...pops].sort((a, b) => b - a))
  })

  it('combines category, price cap and stock', () => {
    const list = applyFilters(PRODUCTS, {
      query: '',
      category: 'desk',
      maxPrice: 20_000,
      inStockOnly: true,
      sort: 'price-asc',
    })
    expect(list.every((p) => p.category === 'desk' && p.price <= 20_000 && p.inStock)).toBe(true)
    expect(list.map((p) => p.price)).toEqual([...list.map((p) => p.price)].sort((a, b) => a - b))
  })

  it('does not mutate the source array', () => {
    const before = PRODUCTS.map((p) => p.id)
    applyFilters(PRODUCTS, { ...DEFAULT_FILTERS, sort: 'price-desc' })
    expect(PRODUCTS.map((p) => p.id)).toEqual(before)
  })
})

describe('pickSimilar', () => {
  it('prefers the same category and excludes the base product', () => {
    const base = PRODUCTS.find((p) => p.slug === 'sony-wh-1000xm5')!
    const list = pickSimilar(PRODUCTS, base)
    expect(list).toHaveLength(4)
    expect(list.some((p) => p.id === base.id)).toBe(false)
    expect(list[0]!.category).toBe(base.category)
  })
})
