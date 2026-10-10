import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/shared/config'
import { formatPrice } from '@/shared/lib'

import type { CartLine } from '../model/types'
import s from './cart.module.css'

type CartLineItemProps = {
  line: CartLine
  media: ReactNode
  quantity: ReactNode
  remove: ReactNode
}

export function CartLineItem({ line, media, quantity, remove }: CartLineItemProps) {
  return (
    <li className={s.line}>
      <Link to={routes.product(line.slug)} className={s.thumb} tabIndex={-1} aria-hidden="true">
        {media}
      </Link>
      <div className={s.body}>
        <div>
          <Link to={routes.product(line.slug)} className={s.name}>
            {line.name}
          </Link>
          <div className={s.variant}>
            {line.colorName} · {line.option}
          </div>
        </div>
        <div className={s.meta}>
          {quantity}
          <span className={s.sum}>{formatPrice(line.price * line.qty)}</span>
          {remove}
        </div>
      </div>
    </li>
  )
}

export function CartLineList({ children }: { children: ReactNode }) {
  return (
    <ul className={s.lines} aria-label="Товары в корзине">
      {children}
    </ul>
  )
}
