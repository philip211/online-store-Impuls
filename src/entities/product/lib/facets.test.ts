import { PRODUCTS } from '../api/mock-db'
import { DEFAULT_FILTERS } from '../model/catalog'
import type { ProductFilters } from '../model/types'
import { computeFacets, rankRelaxations } from './facets'
import { applyFilters } from './query'

const f = (patch: Partial<ProductFilters>): ProductFilters => ({ ...DEFAULT_FILTERS, ...patch })
const priceCount = (facets: ReturnType<typeof computeFacets>, value: number | null) =>
  facets.price.find((p) => p.value === value)?.count

describe('computeFacets', () => {
  it('counts the whole catalogue with no filters', () => {
    const facets = computeFacets(PRODUCTS, DEFAULT_FILTERS)
    expect(facets.total).toBe(PRODUCTS.length)
    expect(facets.category.all).toBe(PRODUCTS.length)
    const perCategory = facets.category.sound + facets.category.mobile
    expect(perCategory + facets.category.photo + facets.category.desk).toBe(PRODUCTS.length)
    expect(facets.stock.any).toBe(PRODUCTS.length)
    expect(facets.stock.inStock).toBe(PRODUCTS.filter((p) => p.inStock).length)
  })

  it('counts each option against the other filters, not its own', () => {
    const filters = f({ category: 'sound', maxPrice: 10_000 })
    const facets = computeFacets(PRODUCTS, filters)
    // Category counts honour the price cap...
    expect(facets.category.sound).toBe(applyFilters(PRODUCTS, filters).length)
    expect(facets.category.mobile).toBe(0)
    // ...and price counts honour the category, ignoring the current cap.
    expect(priceCount(facets, null)).toBe(PRODUCTS.filter((p) => p.category === 'sound').length)
  })

  it('includes the text query in every count', () => {
    const facets = computeFacets(PRODUCTS, f({ query: 'sony', category: 'desk' }))
    expect(facets.total).toBe(0)
    // Sony makes headphones and a camera.
    expect(facets.category.sound).toBe(1)
    expect(facets.category.photo).toBe(1)
    expect(facets.category.all).toBe(2)
    expect(facets.withoutQuery).toBe(PRODUCTS.filter((p) => p.category === 'desk').length)
  })

  it('ignores sort', () => {
    expect(computeFacets(PRODUCTS, f({ sort: 'price-desc' }))).toEqual(
      computeFacets(PRODUCTS, DEFAULT_FILTERS),
    )
  })
})

describe('rankRelaxations', () => {
  it('is empty when nothing narrows the list', () => {
    expect(rankRelaxations(DEFAULT_FILTERS, computeFacets(PRODUCTS, DEFAULT_FILTERS))).toEqual([])
  })

  it('puts the most restrictive filter first and skips dead ends', () => {
    const filters = f({ query: 'sony', category: 'desk', inStockOnly: true })
    const ranked = rankRelaxations(filters, computeFacets(PRODUCTS, filters))
    expect(ranked[0]).toMatchObject({ key: 'query', patch: { query: '' } })
    expect(ranked.map((r) => r.key)).toContain('category')
    // Dropping "in stock" alone still finds no Sony among desk products.
    expect(ranked.map((r) => r.key)).not.toContain('inStockOnly')
    expect(ranked.every((r, i, all) => i === 0 || (all[i - 1]?.count ?? 0) >= r.count)).toBe(true)
  })
})
