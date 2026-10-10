import { queryOptions } from '@tanstack/react-query'

import { api } from '@/shared/api'

import type { ProductFacets } from '../lib/facets'
import type { ProductFilters } from '../model/types'
import { filtersQuery } from './product-api'
import { productQueries } from './product-queries'

/** Facet counts: cheaper than a list call, so it answers a little sooner. */
export const facetsApi = {
  facets(filters: ProductFilters, signal?: AbortSignal): Promise<ProductFacets> {
    return api('/products/facets', { query: filtersQuery(filters), signal })
  },
}

export const facetQueries = {
  facets: ({ query, category, maxPrice, inStockOnly }: ProductFilters) =>
    queryOptions({
      // Sort does not change counts, so it stays out of the key.
      queryKey: [...productQueries.all(), 'facets', { query, category, maxPrice, inStockOnly }],
      queryFn: ({ signal }) =>
        facetsApi.facets({ query, category, maxPrice, inStockOnly, sort: 'popular' }, signal),
    }),
}
