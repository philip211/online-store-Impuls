import { useEffect, useRef } from 'react'

import {
  CheckoutForm,
  OrderSummary,
  useCheckout,
  useLineImages,
  type PlacedOrder,
} from '@/features/checkout'
import { QuantityStepper, RemoveLineButton } from '@/features/edit-cart-line'
import { CartLineItem, CartLineList, countItems, useCartLines } from '@/entities/cart'
import { ProductImage, type ProductImageData } from '@/entities/product'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { Container, text } from '@/shared/ui'

import s from './cart-checkout.module.css'

type CartCheckoutProps = {
  onPlaced: (order: PlacedOrder) => void | Promise<void>
  /** The last line was removed: the page swaps to its empty state and takes focus there. */
  onEmptied?: () => void
}

/** The line's photo; an empty tile while the catalogue loads or if the product is gone. */
function LinePhoto({ image }: { image: ProductImageData | null | undefined }) {
  return image ? <ProductImage image={image} sizes="88px" ratio="1 / 1" decorative /> : null
}

export function CartCheckout({ onPlaced, onEmptied }: CartCheckoutProps) {
  const lines = useCartLines()
  const images = useLineImages(lines)
  const checkout = useCheckout({ onPlaced })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const removeButtons = useRef(new Map<string, HTMLButtonElement>())
  const pendingFocus = useRef<number | null>(null)

  // A removed line unmounts its own button: keep the user's place in the list.
  useEffect(() => {
    const index = pendingFocus.current
    if (index === null) return
    pendingFocus.current = null
    const target = lines[index] ?? lines[index - 1]
    const button = target && removeButtons.current.get(target.key)
    ;(button ?? titleRef.current)?.focus()
  }, [lines])

  return (
    <Container className={s.co}>
      <div>
        <div className={s.head}>
          <h1 ref={titleRef} className={s.title} tabIndex={-1}>
            Корзина
          </h1>
          <span className={text.muted}>{pluralize(countItems(lines), ITEM_FORMS)}</span>
        </div>
        <CartLineList>
          {lines.map((line) => (
            <CartLineItem
              key={line.key}
              line={line}
              media={<LinePhoto image={images.get(line.key)} />}
              quantity={<QuantityStepper line={line} />}
              remove={
                <RemoveLineButton
                  line={line}
                  ref={(el) => {
                    if (el) removeButtons.current.set(line.key, el)
                    else removeButtons.current.delete(line.key)
                  }}
                  onRemoved={(index) => {
                    if (lines.length <= 1) onEmptied?.()
                    else pendingFocus.current = index
                  }}
                />
              }
            />
          ))}
        </CartLineList>
        <CheckoutForm checkout={checkout} subtotal={checkout.totals.subtotal} />
      </div>
      <OrderSummary
        lines={lines}
        shipping={checkout.shipping}
        totals={checkout.totals}
        pending={checkout.pending}
        errorSummary={checkout.errorSummary}
        failed={checkout.failed}
      />
    </Container>
  )
}
