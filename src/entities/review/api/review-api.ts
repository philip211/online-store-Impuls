import { queryOptions } from '@tanstack/react-query'

import { api } from '@/shared/api'

import type { Review } from '../model/types'

export const reviewApi = {
  /** Published reviews of a catalogue section; every one is matched to a delivered order. */
  byGroup(group: string, signal?: AbortSignal): Promise<Review[]> {
    return api('/reviews', { query: { category: group }, signal })
  },
}

export const reviewQueries = {
  byGroup: (group: string) =>
    queryOptions({
      queryKey: ['reviews', group],
      queryFn: ({ signal }) => reviewApi.byGroup(group, signal),
    }),
}
