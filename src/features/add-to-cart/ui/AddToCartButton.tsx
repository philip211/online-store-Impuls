import type { Product } from '@/entities/product'
import { Button } from '@/shared/ui'

import { useAddToCart, type Variant } from '../model/use-add-to-cart'

type AddToCartButtonProps = {
  product: Product
  variant?: Variant
  wide?: boolean
  className?: string
  /** Overrides the default "В корзину" label. */
  label?: string
}

export function AddToCartButton({
  product,
  variant,
  wide,
  className,
  label,
}: AddToCartButtonProps) {
  const { add, added, disabled } = useAddToCart(product, variant)
  const text = disabled ? 'Нет в наличии' : added ? 'Добавлено' : (label ?? 'В корзину')

  return (
    <Button wide={wide} className={className} onClick={add} disabled={disabled}>
      {text}
    </Button>
  )
}
