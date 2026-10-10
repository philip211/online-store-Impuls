import { PRICE_CAPS } from './catalog'
import type { CategoryId, Product, ProductFilters } from './types'
import { applyFilters } from './query'

export type PriceCap = (typeof PRICE_CAPS)[number]['value']

/** Match counts for every filter option, plus the size of the current result. */
export type ProductFacets = {
  total: number
  /** Matches per section code, plus `all`. */
  category: { all: number } & Partial<Record<CategoryId, number>>
  price: { value: PriceCap; count: number }[]
  stock: { any: number; inStock: number }
  /** Result size if the text query were cleared (other filters kept). */
  withoutQuery: number
  /**
   * Highest price in the whole catalogue, independent of the active filters. Lets the UI drop
   * price caps that can never narrow anything without options popping in and out per filter.
   */
  catalogMax: number
}

const count = (products: readonly Product[], f: ProductFilters) => applyFilters(products, f).length

/**
 * Standard faceted counts: each option is counted against the text query and
 * the OTHER active filters, so picking it never shows a number that lies.
 */
export function computeFacets(
  products: readonly Product[],
  f: ProductFilters,
  categoryIds: readonly CategoryId[],
): ProductFacets {
  const category = { all: count(products, { ...f, category: 'all' }) } as ProductFacets['category']
  for (const id of categoryIds) category[id] = count(products, { ...f, category: id })

  return {
    total: count(products, f),
    category,
    price: PRICE_CAPS.map((cap) => ({
      value: cap.value,
      count: count(products, { ...f, maxPrice: cap.value }),
    })),
    stock: {
      any: count(products, { ...f, inStockOnly: false }),
      inStock: count(products, { ...f, inStockOnly: true }),
    },
    withoutQuery: count(products, { ...f, query: '' }),
    catalogMax: products.reduce((max, p) => Math.max(max, p.price), 0),
  }
}

export type FilterKey = 'query' | 'category' | 'maxPrice' | 'inStockOnly'

export type Relaxation = { key: FilterKey; patch: Partial<ProductFilters>; count: number }

/**
 * Active filters ranked by how many products dropping each one alone would bring
 * back — the first item is the most restrictive filter. Dead ends are skipped.
 */
export function rankRelaxations(f: ProductFilters, facets: ProductFacets): Relaxation[] {
  const anyPrice = facets.price.find((p) => p.value === null)?.count ?? facets.total
  const options: (Relaxation | false)[] = [
    f.category !== 'all' && {
      key: 'category',
      patch: { category: 'all' },
      count: facets.category.all,
    },
    f.maxPrice !== null && { key: 'maxPrice', patch: { maxPrice: null }, count: anyPrice },
    f.inStockOnly && {
      key: 'inStockOnly',
      patch: { inStockOnly: false },
      count: facets.stock.any,
    },
    f.query !== '' && { key: 'query', patch: { query: '' }, count: facets.withoutQuery },
  ]
  return options
    .filter((o): o is Relaxation => o !== false && o.count > 0)
    .sort((a, b) => b.count - a.count)
}
