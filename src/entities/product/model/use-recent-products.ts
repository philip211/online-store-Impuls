import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { productQueries } from '../api/product-queries'
import { useRecentlyViewed } from './recently-viewed'

/** Recently viewed products, newest first, optionally without the one on screen. */
export function useRecentProducts({
  exclude,
  limit = 4,
}: { exclude?: number; limit?: number } = {}) {
  const ids = useRecentlyViewed((s) => s.ids)
  const wanted = ids.filter((id) => id !== exclude).slice(0, limit)
  const query = useQuery({ ...productQueries.byIds(wanted), placeholderData: keepPreviousData })
  return wanted.length ? (query.data ?? []) : []
}
