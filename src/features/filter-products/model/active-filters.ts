import {
  CATEGORY_NAMES,
  DEFAULT_FILTERS,
  PRICE_CAPS,
  type FilterKey,
  type ProductFilters,
} from '@/entities/product'
import { formatPrice } from '@/shared/lib'

export type ActiveFilter = {
  key: FilterKey
  /** Short visible text of the pill. */
  label: string
  /** Patch that removes this filter. */
  clear: Partial<ProductFilters>
}

export const priceLabel = (max: number) =>
  PRICE_CAPS.find((c) => c.value === max)?.label ?? `до ${formatPrice(max)}`

/** Human label of one active filter, e.g. "Звук" or "до 10 000 ₽". */
export function filterLabel(key: FilterKey, f: ProductFilters): string {
  switch (key) {
    case 'query':
      return `Поиск: «${f.query}»`
    case 'category':
      return f.category === 'all' ? 'Все категории' : CATEGORY_NAMES[f.category]
    case 'maxPrice':
      return f.maxPrice === null ? 'Любая цена' : priceLabel(f.maxPrice)
    case 'inStockOnly':
      return 'В наличии'
  }
}

const clearPatch = (key: FilterKey): Partial<ProductFilters> => {
  switch (key) {
    case 'query':
      return { query: DEFAULT_FILTERS.query }
    case 'category':
      return { category: DEFAULT_FILTERS.category }
    case 'maxPrice':
      return { maxPrice: DEFAULT_FILTERS.maxPrice }
    case 'inStockOnly':
      return { inStockOnly: DEFAULT_FILTERS.inStockOnly }
  }
}

/** Removable pills in reading order: query first, then sidebar order. */
export function listActiveFilters(f: ProductFilters): ActiveFilter[] {
  const keys: FilterKey[] = []
  if (f.query) keys.push('query')
  if (f.category !== 'all') keys.push('category')
  if (f.maxPrice !== null) keys.push('maxPrice')
  if (f.inStockOnly) keys.push('inStockOnly')
  return keys.map((key) => ({ key, label: filterLabel(key, f), clear: clearPatch(key) }))
}
