import clsx from 'clsx'

import { formatPrice } from '@/shared/lib'

import { isOnSale } from '../lib/pricing'
import type { Product } from '../model/types'
import s from './product.module.css'

type PriceTagProps = {
  product: Pick<Product, 'price' | 'oldPrice'>
  size?: 'md' | 'lg'
  /** Inline puts the old price on the same row (product page). */
  layout?: 'stack' | 'inline'
  showOld?: boolean
}

export function PriceTag({
  product,
  size = 'md',
  layout = 'stack',
  showOld = true,
}: PriceTagProps) {
  const sale = isOnSale(product)
  return (
    <div className={clsx(layout === 'inline' && s.priceInline)}>
      <div className={clsx(s.price, sale && s.sale, size === 'lg' && s.priceLg)}>
        {sale && <span className={s.srOnly}>Цена со скидкой: </span>}
        {formatPrice(product.price)}
      </div>
      {sale && showOld && (
        <s className={s.old}>
          <span className={s.srOnly}>Старая цена: </span>
          {formatPrice(product.oldPrice as number)}
        </s>
      )}
    </div>
  )
}
