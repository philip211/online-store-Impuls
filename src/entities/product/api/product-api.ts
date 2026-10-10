import { api, isApiError } from '@/shared/api'

import type { SearchResult } from '../lib/query'
import type { Category, Product, ProductFilters } from '../model/types'

/** The product the home page hero and story are about. */
export const HERO_SLUG = 'sony-wh-1000xm5'

/** Storefront filters as the API's query string (same names as the catalogue URL). */
export const filtersQuery = ({ query, category, maxPrice, inStockOnly, sort }: ProductFilters) => ({
  q: query.trim() || undefined,
  category: category === 'all' ? undefined : category,
  maxPrice,
  inStock: inStockOnly || undefined,
  sort: sort === 'popular' ? undefined : sort,
})

/** Catalogue endpoints of the store API (server/src/modules/catalog). */
export const productApi = {
  async list(filters: ProductFilters, signal?: AbortSignal): Promise<Product[]> {
    const res = await api<{ items: Product[] }>('/products', {
      query: filtersQuery(filters),
      signal,
    })
    return res.items
  },

  /** Palette search: top matches plus a "did you mean" when the query was repaired. */
  search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    return api('/products/search', { query: { q: query }, signal })
  },

  async bySlug(slug: string, signal?: AbortSignal): Promise<Product | null> {
    try {
      return await api<Product>(`/products/${encodeURIComponent(slug)}`, { signal })
    } catch (e) {
      // A malformed slug is answered with 400: for the page it is just as missing.
      if (isApiError(e, 'NOT_FOUND') || isApiError(e, 'VALIDATION_FAILED')) return null
      throw e
    }
  },

  /** Keeps the requested order and silently drops unknown ids. */
  byIds(ids: readonly number[], signal?: AbortSignal): Promise<Product[]> {
    return api('/products/lookup', { query: { ids: ids.join(',') }, signal })
  },

  /** Keeps the requested order and silently drops unknown slugs. */
  bySlugs(slugs: readonly string[], signal?: AbortSignal): Promise<Product[]> {
    return api('/products/lookup', { query: { slugs: slugs.join(',') }, signal })
  },

  similar(slug: string, signal?: AbortSignal): Promise<Product[]> {
    return api(`/products/${encodeURIComponent(slug)}/similar`, { signal })
  },

  featured(signal?: AbortSignal): Promise<Product[]> {
    return api('/products/featured', { signal })
  },

  /** Discounted products, biggest discount first. */
  deals(signal?: AbortSignal): Promise<Product[]> {
    return api('/products/deals', { signal })
  },

  categories(signal?: AbortSignal): Promise<Category[]> {
    return api('/categories', { signal })
  },
}
