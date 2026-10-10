import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { facetQueries, type ProductFilters } from '@/entities/product'

/** Facet counts for the current filters; previous counts stay while new ones load. */
export function useProductFacets(filters: ProductFilters) {
  const { data, isPlaceholderData } = useQuery({
    ...facetQueries.facets(filters),
    placeholderData: keepPreviousData,
  })
  return { facets: data, isStale: isPlaceholderData }
}
