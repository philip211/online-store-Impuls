import clsx from 'clsx'
import { Link } from 'react-router'

import type { Product } from '@/entities/product'
import { routes } from '@/shared/config'
import { CheckIcon, PlusIcon } from '@/shared/ui'

import { useAddToCart } from '../model/use-add-to-cart'
import s from './add-to-cart.module.css'

/** Id of the restock e-mail field on the product page. */
const RESTOCK_ANCHOR = 'pd-restock-email'

export function AddToCartIconButton({ product }: { product: Product }) {
  if (!product.inStock) return <RestockLink product={product} />
  return <AddButton product={product} />
}

/** Out of stock: instead of a dead, faded "+", point to the restock alert on the product page. */
function RestockLink({ product }: { product: Product }) {
  return (
    <Link
      to={`${routes.product(product.slug)}#${RESTOCK_ANCHOR}`}
      viewTransition
      className={s.restock}
      aria-label={`Нет в наличии. Сообщить о поступлении: ${product.name}`}
    >
      Сообщить
    </Link>
  )
}

function AddButton({ product }: { product: Product }) {
  const { add, added, disabled } = useAddToCart(product)

  return (
    <button
      type="button"
      className={clsx(s.icon, added && s.done)}
      onClick={add}
      disabled={disabled}
      aria-label={
        disabled ? `Нет в наличии: ${product.name}` : `Добавить в корзину: ${product.name}`
      }
    >
      {added ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
    </button>
  )
}
