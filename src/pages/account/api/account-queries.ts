import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'

import type { Order, Page, Tracking } from '@/entities/order'
import { api } from '@/shared/api'

export type AccountOrder = Order & { tracking: Tracking }

const PAGE_SIZE = 10

/** Personal data lives under ['me'], so signing out can drop all of it at once. */
export const accountQueries = {
  orders: () =>
    infiniteQueryOptions({
      queryKey: ['me', 'orders'],
      queryFn: ({ pageParam, signal }) =>
        api<Page<Order>>('/me/orders', { query: { page: pageParam, limit: PAGE_SIZE }, signal }),
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined,
    }),

  order: (number: string) =>
    queryOptions({
      queryKey: ['me', 'orders', number],
      queryFn: ({ signal }) =>
        api<AccountOrder>(`/me/orders/${encodeURIComponent(number)}`, { signal }),
      // Payment and delivery move on their own: refresh when the shopper comes back.
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    }),
}
