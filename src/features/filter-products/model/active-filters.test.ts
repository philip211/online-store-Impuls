import { DEFAULT_FILTERS } from '@/entities/product'

import { filterLabel, listActiveFilters, priceLabel } from './active-filters'

describe('active filter pills', () => {
  it('has no pills for default filters', () => {
    expect(listActiveFilters({ ...DEFAULT_FILTERS, sort: 'price-asc' })).toEqual([])
  })

  it('lists the query first, then sidebar order, each with its own clear patch', () => {
    const pills = listActiveFilters({
      query: 'sony',
      category: 'sound',
      maxPrice: 50_000,
      inStockOnly: true,
      sort: 'popular',
    })
    expect(pills.map((p) => p.label)).toEqual(['Поиск: «sony»', 'Звук', 'до 50 000 ₽', 'В наличии'])
    expect(pills.map((p) => p.clear)).toEqual([
      { query: '' },
      { category: 'all' },
      { maxPrice: null },
      { inStockOnly: false },
    ])
  })

  it('formats price caps that are not presets', () => {
    expect(priceLabel(15_000).replace(/\s/g, ' ')).toBe('до 15 000 ₽')
    expect(filterLabel('maxPrice', { ...DEFAULT_FILTERS, maxPrice: 20_000 })).toBe('до 20 000 ₽')
  })
})
