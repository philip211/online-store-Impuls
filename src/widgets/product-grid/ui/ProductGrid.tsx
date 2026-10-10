import clsx from 'clsx'

import { AddToCartIconButton } from '@/features/add-to-cart'
import { FavoriteButton } from '@/features/toggle-favorite'
import { ProductCard, ProductCardSkeleton, type Product } from '@/entities/product'

import s from './product-grid.module.css'

type Layout = { columns?: 3 | 4 }

type ProductGridProps = Layout & {
  products: Product[]
  /** Compact cards drop the discount badge, old price and the add button. */
  compact?: boolean
  reveal?: boolean
  /** How many leading cards sit above the fold and load their photo eagerly (LCP). */
  priorityCount?: number
  /**
   * How many of those also get fetchpriority=high: only the cards in the first row at every
   * width (phones show two columns). Defaults to priorityCount.
   */
  highPriorityCount?: number
}

export function ProductGrid({
  products,
  columns = 3,
  compact,
  reveal,
  priorityCount = 0,
  highPriorityCount = priorityCount,
}: ProductGridProps) {
  return (
    <div className={clsx(s.grid, columns === 4 && s.four)}>
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          compact={compact}
          reveal={reveal}
          priority={i < priorityCount}
          fetchPriority={i < highPriorityCount ? 'high' : 'auto'}
          action={compact ? undefined : <AddToCartIconButton product={p} />}
          corner={<FavoriteButton product={p} />}
        />
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ count = 6, columns = 3 }: Layout & { count?: number }) {
  return (
    <div
      className={clsx(s.grid, columns === 4 && s.four)}
      aria-busy="true"
      aria-label="Загружаем товары"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}
