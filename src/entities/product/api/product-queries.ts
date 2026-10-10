import { queryOptions } from '@tanstack/react-query'

import type { ProductFilters } from '../model/types'
import { productApi } from './product-api'

export const productQueries = {
  all: () => ['products'] as const,

  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'list', filters],
      queryFn: ({ signal }) => productApi.list(filters, signal),
    }),

  /** Top matches plus `correctedQuery` ("did you mean") for the palette. */
  search: (query: string) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'search', query],
      queryFn: ({ signal }) => productApi.search(query, signal),
      enabled: query.trim().length > 0,
    }),

  byIds: (ids: readonly number[]) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'by-ids', ids],
      queryFn: ({ signal }) => productApi.byIds(ids, signal),
      enabled: ids.length > 0,
    }),

  bySlugs: (slugs: readonly string[]) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'by-slugs', slugs],
      queryFn: ({ signal }) => productApi.bySlugs(slugs, signal),
      enabled: slugs.length > 0,
    }),

  detail: (slug: string) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'detail', slug],
      queryFn: ({ signal }) => productApi.bySlug(slug, signal),
    }),

  similar: (slug: string) =>
    queryOptions({
      queryKey: [...productQueries.all(), 'similar', slug],
      queryFn: ({ signal }) => productApi.similar(slug, signal),
    }),

  featured: () =>
    queryOptions({
      queryKey: [...productQueries.all(), 'featured'],
      queryFn: ({ signal }) => productApi.featured(signal),
    }),

  deals: () =>
    queryOptions({
      queryKey: [...productQueries.all(), 'deals'],
      queryFn: ({ signal }) => productApi.deals(signal),
    }),

  categories: () =>
    queryOptions({
      queryKey: ['categories'],
      queryFn: ({ signal }) => productApi.categories(signal),
      staleTime: Infinity,
    }),
}
