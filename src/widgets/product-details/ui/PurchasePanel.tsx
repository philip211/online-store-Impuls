import { useState } from 'react'
import { Link } from 'react-router'

import type { Product } from '@/entities/product'
import { FREE_SHIPPING_FROM, RETURN_DAYS, routes } from '@/shared/config'
import { describeDelivery, formatPrice } from '@/shared/lib'
import { ArrowRightIcon, CardIcon, ReturnIcon, TruckIcon } from '@/shared/ui'

import { courierCost, totalWithDelivery } from '../lib/purchase'
import s from './product-details.module.css'

/**
 * Everything a buyer needs at the moment of decision: the delivery date, the
 * full cost, how to return and how to pay — next to the button, not in a footer.
 */
export function PurchasePanel({ product }: { product: Pick<Product, 'price' | 'inStock'> }) {
  // Fixed per mount so the dates do not shift during a re-render.
  const [now] = useState(() => new Date())
  const courier = courierCost(product.price)
  const courierText = courier
    ? `${formatPrice(courier)} / бесплатно от ${formatPrice(FREE_SHIPPING_FROM)}`
    : 'бесплатно'

  return (
    <div className={s.panel}>
      {product.inStock && (
        <p className={s.total}>
          <span>Итого с доставкой</span>
          <b>{formatPrice(totalWithDelivery(product.price))}</b>
        </p>
      )}

      <ul className={s.perks}>
        {product.inStock ? (
          <li>
            <TruckIcon size={20} />
            <span>
              {describeDelivery('courier', now)} · <b>{courierText}</b>
              <br />
              {describeDelivery('pickup', now)} · <b>бесплатно</b>
            </span>
          </li>
        ) : (
          // No dates without stock: say how it will travel once it is back.
          <li>
            <TruckIcon size={20} />
            <span>
              После поступления — курьером · <b>{courierText}</b>
              <br />
              или в пункт выдачи · <b>бесплатно</b>
            </span>
          </li>
        )}
        <li>
          <ReturnIcon size={20} />
          <Link to={routes.help('returns')} viewTransition className={s.perkLink}>
            Возврат {RETURN_DAYS} дней — без объяснения причин
          </Link>
        </li>
        <li>
          <CardIcon size={20} />
          <Link to={routes.help('payment')} viewTransition className={s.perkLink}>
            Картой, через СБП или при получении
          </Link>
        </li>
      </ul>

      <Link to={routes.help('contacts')} viewTransition className={s.advice}>
        <span>
          Нужен совет? <span className={s.adviceMuted}>Специалист ответит за 5 минут</span>
        </span>
        <ArrowRightIcon size={18} />
      </Link>
    </div>
  )
}
