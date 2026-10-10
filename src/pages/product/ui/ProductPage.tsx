import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Link, useLoaderData } from 'react-router'

import {
  CATEGORY_NAMES,
  productQueries,
  useRecentlyViewed,
  useRecentProducts,
  type Product,
} from '@/entities/product'
import { reviewQueries, summarize } from '@/entities/review'
import { routes } from '@/shared/config'
import {
  ButtonLink,
  ChevronLeftIcon,
  Container,
  EmptyState,
  Section,
  SectionHeader,
} from '@/shared/ui'
import { ProductDetails } from '@/widgets/product-details'
import { ProductGrid, ProductGridSkeleton } from '@/widgets/product-grid'
import { ProductReviews } from '@/widgets/product-reviews'

import type { productLoader } from '../api/loader'
import { buildProductJsonLd, serializeJsonLd } from '../lib/json-ld'
import s from './product-page.module.css'

export function ProductPage() {
  const { slug } = useLoaderData<typeof productLoader>()
  // The loader checked the product exists, but a background refetch can find it delisted since.
  const product = useSuspenseQuery(productQueries.detail(slug)).data
  if (!product) return <ProductGone />
  return <ProductContent product={product} slug={slug} />
}

/** The product left the catalogue while the page was open. */
function ProductGone() {
  return (
    <Container page>
      <title>Товар снят с продажи — Импульс</title>
      <EmptyState
        as="h1"
        size="page"
        title="Этот товар больше не продаётся"
        description="Посмотрите похожие в каталоге — там только то, что можно купить сейчас."
        action={<ButtonLink to={routes.catalog()}>В каталог</ButtonLink>}
      />
    </Container>
  )
}

function ProductContent({ product, slug }: { product: Product; slug: string }) {
  const similar = useQuery(productQueries.similar(slug)).data
  // Same query as the reviews widget, so this costs no extra request.
  const reviews = useQuery(reviewQueries.byGroup(product.category)).data
  const recent = useRecentProducts({ exclude: product.id })
  const record = useRecentlyViewed((st) => st.record)

  useEffect(() => record(product.id), [record, product.id])

  const jsonLd = useMemo(
    () =>
      serializeJsonLd(
        buildProductJsonLd({
          product,
          categoryName: CATEGORY_NAMES[product.category],
          origin: window.location.origin,
          rating: reviews ? summarize(reviews) : null,
        }),
      ),
    [product, reviews],
  )

  return (
    <>
      <title>{`${product.name} — купить в Импульсе`}</title>
      <meta name="description" content={product.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Container className={s.crumb}>
        <nav aria-label="Хлебные крошки">
          <ol className={s.trail}>
            <li>
              <Link to={routes.catalog()} viewTransition className={s.back}>
                <ChevronLeftIcon size={20} />
                Каталог
              </Link>
            </li>
            <li className={s.trailExtra}>
              <Link
                to={`${routes.catalog()}?cat=${product.category}`}
                viewTransition
                className={s.back}
              >
                {CATEGORY_NAMES[product.category]}
              </Link>
            </li>
            <li className={s.trailExtra} aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>
      </Container>

      <ProductDetails key={product.id} product={product} />

      <ProductReviews
        key={`reviews-${product.id}`}
        group={product.category}
        productId={product.id}
      />

      <Section flush className={s.section} aria-labelledby="h-sim">
        <SectionHeader id="h-sim" title="Похожие товары" />
        {similar ? (
          <ProductGrid products={similar} columns={4} compact reveal />
        ) : (
          <ProductGridSkeleton count={4} columns={4} />
        )}
      </Section>

      {recent.length > 0 && (
        <Section flush className={s.section} aria-labelledby="h-recent">
          <SectionHeader id="h-recent" title="Вы смотрели" />
          <ProductGrid products={recent} columns={4} compact reveal />
        </Section>
      )}
    </>
  )
}
