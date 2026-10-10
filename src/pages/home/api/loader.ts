import { HERO_SLUG, productQueries } from '@/entities/product'
import { queryClient } from '@/shared/api'

/** Warm the cache in parallel before the route renders (no waterfalls). */
export async function homeLoader() {
  await Promise.all([
    queryClient.ensureQueryData(productQueries.detail(HERO_SLUG)),
    queryClient.ensureQueryData(productQueries.featured()),
    queryClient.ensureQueryData(productQueries.categories()),
    queryClient.ensureQueryData(productQueries.deals()),
  ])
  return null
}
