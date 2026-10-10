import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  DEFAULT_FILTERS,
  isCategoryId,
  isProductSort,
  type ProductFilters,
} from '@/entities/product'

/** URL is the source of truth: filters are shareable, bookmarkable and survive reloads. */
export function parseFilters(params: URLSearchParams): ProductFilters {
  const cat = params.get('cat')
  const max = Number(params.get('max'))
  const sort = params.get('sort')
  return {
    query: (params.get('q') ?? '').trim().slice(0, 80),
    category: isCategoryId(cat) ? cat : DEFAULT_FILTERS.category,
    maxPrice: Number.isFinite(max) && max > 0 ? max : null,
    inStockOnly: params.get('stock') === '1',
    sort: isProductSort(sort) ? sort : DEFAULT_FILTERS.sort,
  }
}

export function serializeFilters(f: ProductFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.query) p.set('q', f.query)
  if (f.category !== 'all') p.set('cat', f.category)
  if (f.maxPrice !== null) p.set('max', String(f.maxPrice))
  if (f.inStockOnly) p.set('stock', '1')
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort)
  return p
}

/** Number of narrowing filters in effect (sort does not narrow). */
export const countActive = (f: ProductFilters) =>
  Number(f.category !== 'all') + Number(f.maxPrice !== null) + Number(f.inStockOnly)

export function useProductFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  const update = useCallback(
    (patch: Partial<ProductFilters>) =>
      setParams((prev) => serializeFilters({ ...parseFilters(prev), ...patch }), {
        replace: true,
        preventScrollReset: true,
      }),
    [setParams],
  )

  /** Clears narrowing filters; keeps sort and the search query. */
  const reset = useCallback(
    () =>
      setParams(
        (prev) => {
          const { sort, query } = parseFilters(prev)
          return serializeFilters({ ...DEFAULT_FILTERS, sort, query })
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  )

  /** Clears narrowing filters and the search query; keeps sort. */
  const resetAll = useCallback(
    () =>
      setParams((prev) => serializeFilters({ ...DEFAULT_FILTERS, sort: parseFilters(prev).sort }), {
        replace: true,
        preventScrollReset: true,
      }),
    [setParams],
  )

  const activeCount = countActive(filters)

  return { filters, update, reset, resetAll, activeCount, isDirty: activeCount > 0 }
}
