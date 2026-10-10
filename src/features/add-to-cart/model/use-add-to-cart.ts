import { useCallback } from 'react'

import { useCartStore, type CartLineInput } from '@/entities/cart'
import { getImage, type Product } from '@/entities/product'
import { routes } from '@/shared/config'
import { toast, useFlash } from '@/shared/lib'

export type Variant = { colorIndex: number; optionIndex: number }

export function toCartLine(product: Product, { colorIndex, optionIndex }: Variant): CartLineInput {
  const color = product.colors[colorIndex] ?? product.colors[0]
  const option = product.options[optionIndex] ?? product.options[0]
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    kind: product.kind,
    image: getImage(product, { color: color.name })?.id,
    price: product.price,
    colorName: color.name,
    colorHex: color.hex,
    option,
  }
}

const DEFAULT_VARIANT: Variant = { colorIndex: 0, optionIndex: 0 }

/** Adds a product to the cart with a toast and a short "added" state. */
export function useAddToCart(product: Product, variant: Variant = DEFAULT_VARIANT) {
  const addLine = useCartStore((s) => s.add)
  const [added, flash] = useFlash(1300)
  const { colorIndex, optionIndex } = variant

  const add = useCallback(() => {
    if (!product.inStock) return
    addLine(toCartLine(product, { colorIndex, optionIndex }))
    toast(`${product.name} — в корзине`, { action: { label: 'Оформить', to: routes.cart() } })
    flash()
  }, [product, colorIndex, optionIndex, addLine, flash])

  return { add, added, disabled: !product.inStock }
}
