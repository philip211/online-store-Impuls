import { DEFAULT_FILTERS } from '@/entities/product'

import { parseFilters, serializeFilters } from './use-product-filters'

describe('filters ⇄ URL', () => {
  it('defaults produce an empty query string', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('round-trips every field', () => {
    const f = {
      query: 'sony',
      category: 'sound',
      maxPrice: 10_000,
      inStockOnly: true,
      sort: 'price-desc',
    } as const
    expect(parseFilters(serializeFilters(f))).toEqual(f)
  })

  it('ignores garbage values', () => {
    const f = parseFilters(new URLSearchParams('cat=toasters&max=-5&sort=random&stock=yes'))
    expect(f).toEqual(DEFAULT_FILTERS)
  })
})
