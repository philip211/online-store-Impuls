import type { ProductFilters, ProductSort } from './types'

/** Price caps offered by the catalogue filter; facets count each of them. */
export const PRICE_CAPS = [
  { value: null, label: 'Любая' },
  { value: 20_000, label: 'до 20 000 ₽' },
  { value: 50_000, label: 'до 50 000 ₽' },
  { value: 100_000, label: 'до 100 000 ₽' },
] as const

export const PRODUCT_SORTS = ['popular', 'price-asc', 'price-desc'] as const satisfies ProductSort[]

export const DEFAULT_FILTERS: ProductFilters = {
  query: '',
  category: 'all',
  maxPrice: null,
  inStockOnly: false,
  sort: 'popular',
}

export const isOnSale = (p: { price: number; oldPrice: number | null }) =>
  p.oldPrice !== null && p.oldPrice > p.price

/** Share of the old price taken off: 0.11 for 32 990 instead of 36 990. */
export const discountShare = (p: { price: number; oldPrice: number | null }) =>
  p.oldPrice ? 1 - p.price / p.oldPrice : 0
