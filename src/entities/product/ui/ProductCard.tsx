import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link, useViewTransitionState } from 'react-router'

import { routes } from '@/shared/config'
import { Badge, Skeleton, text } from '@/shared/ui'

import { getImage } from '../lib/images'
import { discountLabel, isOnSale } from '../lib/pricing'
import { morphNames } from '../lib/morph'
import type { Product } from '../model/types'
import { PriceTag } from './PriceTag'
import { ProductImage } from './ProductImage'
import s from './product.module.css'

type ProductCardProps = {
  product: Product
  /** Slot for an action such as "add to cart" — injected by upper layers. */
  action?: ReactNode
  /** Slot over the top-right corner of the tile, e.g. a wishlist toggle. */
  corner?: ReactNode
  compact?: boolean
  reveal?: boolean
  /** First cards above the fold: load the photo eagerly (LCP). */
  priority?: boolean
  /** 'auto' keeps an eager photo from competing with the likely LCP cards. */
  fetchPriority?: 'high' | 'auto'
}

/** Cards are about a quarter of the container on desktop, a half on phones. */
const CARD_SIZES =
  '(min-width: 1320px) 320px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

export function ProductCard({
  product,
  action,
  corner,
  compact,
  reveal,
  priority,
  fetchPriority,
}: ProductCardProps) {
  const sale = isOnSale(product)
  const photo = getImage(product)
  const to = routes.product(product.slug)
  // Name the tile only while navigating to/from this product so it morphs into the gallery.
  const morph = useViewTransitionState(to) ? morphNames(product.slug) : null

  return (
    <article className={clsx(s.card, !product.inStock && s.soldOut, reveal && text.reveal)}>
      <Link to={to} viewTransition className={s.hit}>
        <div className={s.tile} style={{ viewTransitionName: morph?.box }}>
          {/* The product is named right below in the same link, so the photo stays silent. */}
          {photo && (
            <ProductImage
              image={photo}
              sizes={CARD_SIZES}
              ratio="4 / 5"
              priority={priority}
              fetchPriority={fetchPriority}
              decorative
              className={s.photo}
              style={{ viewTransitionName: morph?.art }}
            />
          )}
          {sale && !compact && product.inStock && <Badge floating>{discountLabel(product)}</Badge>}
        </div>
        <div className={s.meta}>
          <div className={s.kindRow}>
            <span className={text.mono}>{product.kind}</span>
            {product.colors.length > 1 && (
              <span
                className={s.swatches}
                aria-label={`Цвета: ${product.colors.map((c) => c.name).join(', ')}`}
              >
                {product.colors.slice(0, 4).map((c) => (
                  <i key={c.name} style={{ background: c.hex }} />
                ))}
              </span>
            )}
          </div>
          <div className={s.name}>{product.name}</div>
          {/* Visible state lives in the price row (restock link) so every card keeps one baseline. */}
          {!product.inStock && <span className={s.srOnly}>Нет в наличии</span>}
        </div>
      </Link>
      {corner && <div className={s.corner}>{corner}</div>}
      <div className={s.row}>
        <PriceTag product={product} showOld={!compact} />
        {action}
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className={s.card}>
      <Skeleton variant="tile" />
      <Skeleton />
      <Skeleton variant="short" />
    </div>
  )
}
