import { data, type LoaderFunctionArgs } from 'react-router'

import { productQueries } from '@/entities/product'
import { reviewQueries } from '@/entities/review'
import { queryClient } from '@/shared/api'

export async function productLoader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? ''
  const product = await queryClient.ensureQueryData(productQueries.detail(slug))
  if (!product) throw data('Товар не найден', { status: 404 })
  // Fire and forget: secondary content streams in after the page renders.
  void queryClient.prefetchQuery(productQueries.similar(slug))
  void queryClient.prefetchQuery(reviewQueries.byGroup(product.category))
  return { slug }
}
