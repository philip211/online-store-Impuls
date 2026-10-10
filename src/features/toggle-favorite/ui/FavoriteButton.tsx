import clsx from 'clsx'

import type { Product } from '@/entities/product'
import { useIsWished, useWishlistStore } from '@/entities/wishlist'
import { routes } from '@/shared/config'
import { toast } from '@/shared/lib'
import { HeartIcon } from '@/shared/ui'

import s from './favorite-button.module.css'

type FavoriteButtonProps = {
  product: Pick<Product, 'id' | 'name'>
  /** `floating` sits over a card tile; `square` matches 56px buttons. */
  look?: 'floating' | 'square'
  className?: string
}

export function FavoriteButton({ product, look = 'floating', className }: FavoriteButtonProps) {
  const wished = useIsWished(product.id)
  const toggle = useWishlistStore((st) => st.toggle)

  return (
    <button
      type="button"
      className={clsx(s.fav, s[look], wished && s.on, className)}
      aria-pressed={wished}
      aria-label={wished ? `Убрать из избранного: ${product.name}` : `В избранное: ${product.name}`}
      onClick={() => {
        const added = toggle(product.id)
        toast(added ? 'Добавлено в избранное' : 'Убрано из избранного', {
          action: added
            ? { label: 'Открыть', to: routes.favorites() }
            : { label: 'Вернуть', onClick: () => toggle(product.id) },
        })
      }}
    >
      <HeartIcon size={look === 'square' ? 22 : 18} filled={wished} />
    </button>
  )
}
