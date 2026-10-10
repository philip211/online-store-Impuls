import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { productQueries } from '@/entities/product'
import { useWishlistIds } from '@/entities/wishlist'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ButtonLink, Container, EmptyState, text } from '@/shared/ui'
import { ProductGrid, ProductGridSkeleton } from '@/widgets/product-grid'

import { LEGACY_SHARE_PARAM, parseShareSlugs, SHARE_PARAM } from '../lib/share'
import { FavoritesActions } from './FavoritesActions'
import s from './favorites-page.module.css'
import { ExpiredShareBanner, SharedBanner } from './SharedBanner'

export function FavoritesPage() {
  const ids = useWishlistIds()
  const [params, setParams] = useSearchParams()
  const sharedSlugs = useMemo(() => parseShareSlugs(params.get(SHARE_PARAM)), [params])
  // An old id-based link: its ids now point at other products, so say it has expired.
  const expiredShare = sharedSlugs.length === 0 && params.has(LEGACY_SHARE_PARAM)
  // keepPreviousData: removing an item doesn't flash a skeleton.
  const { data } = useQuery({ ...productQueries.byIds(ids), placeholderData: keepPreviousData })
  const products = (data ?? []).filter((p) => ids.includes(p.id))

  const closeShared = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(SHARE_PARAM)
        next.delete(LEGACY_SHARE_PARAM)
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  return (
    <Container page className={s.page}>
      <title>Избранное — Импульс</title>
      <div className={s.head}>
        <div className={s.heading}>
          <h1 className={text.pageTitle}>Избранное</h1>
          {ids.length > 0 && (
            <p className={text.mono} aria-live="polite">
              {pluralize(ids.length, ITEM_FORMS)}
            </p>
          )}
        </div>
        {products.length > 0 && <FavoritesActions products={products} />}
      </div>

      {sharedSlugs.length > 0 && <SharedBanner slugs={sharedSlugs} onClose={closeShared} />}
      {expiredShare && <ExpiredShareBanner onClose={closeShared} />}

      {ids.length === 0 && sharedSlugs.length > 0 ? (
        // The shared list above is the content; a quiet line instead of a second empty state.
        <p className={s.ownEmpty}>
          Ваше избранное пока пусто — сохраните подборку или отмечайте товары сердечком.
        </p>
      ) : ids.length === 0 ? (
        <EmptyState
          as="h2"
          title="Пока пусто"
          description="Нажмите на сердечко у товара — он появится здесь, чтобы вернуться к нему позже."
          action={<ButtonLink to={routes.catalog()}>В каталог</ButtonLink>}
        />
      ) : data ? (
        <ProductGrid products={products} columns={4} />
      ) : (
        <ProductGridSkeleton count={Math.min(ids.length, 4)} columns={4} />
      )}
    </Container>
  )
}
