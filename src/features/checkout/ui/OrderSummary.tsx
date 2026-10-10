import { Link } from 'react-router'

import { countItems, type CartLine } from '@/entities/cart'
import { ProductImage } from '@/entities/product'
import { RETURN_DAYS, routes } from '@/shared/config'
import { describeDelivery, formatPrice, ITEM_FORMS, pluralize } from '@/shared/lib'
import { Button, ReturnIcon, text } from '@/shared/ui'

import { useLineImages } from '../model/line-images'
import type { OrderTotals } from '../model/pricing'
import type { ShippingMethod } from '../model/schema'
import { CHECKOUT_FORM_ID } from '../model/use-checkout'
import s from './checkout.module.css'
import { FreeShippingMeter } from './FreeShippingMeter'

type OrderSummaryProps = {
  lines: readonly CartLine[]
  shipping: ShippingMethod
  totals: OrderTotals
  pending: boolean
  /** Shown after a submit attempt with invalid fields. */
  errorSummary: string | null
  /** Message about a failed submit, or null. */
  failed: string | null
}

const submitLabel = (pending: boolean) => (pending ? 'Отправляем…' : 'Оформить заказ')

export function OrderSummary({
  lines,
  shipping,
  totals,
  pending,
  errorSummary,
  failed,
}: OrderSummaryProps) {
  const images = useLineImages(lines)

  return (
    <>
      <aside className={s.sum} aria-labelledby="order-summary-title">
        <h2 id="order-summary-title" className={s.sumTitle}>
          Ваш заказ
        </h2>

        <ul className={s.items} aria-label="Состав заказа">
          {lines.map((line) => {
            const image = images.get(line.key)
            return (
              <li key={line.key} className={s.item}>
                <span className={s.itemThumb}>
                  {image && <ProductImage image={image} sizes="48px" ratio="1 / 1" decorative />}
                </span>
                <span className={s.itemName}>
                  {line.name}
                  <span className={s.itemMeta}>
                    {line.qty > 1 ? `${line.qty} × ${formatPrice(line.price)}` : line.colorName}
                  </span>
                </span>
                <span className={s.itemPrice}>{formatPrice(line.price * line.qty)}</span>
              </li>
            )
          })}
        </ul>

        <div className={s.row}>
          <span className={text.muted}>{pluralize(countItems(lines), ITEM_FORMS)}</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        <div className={s.row}>
          <span className={text.muted}>
            Доставка
            <span className={s.rowSub}>{describeDelivery(shipping)}</span>
          </span>
          <span>{totals.shipping ? formatPrice(totals.shipping) : 'Бесплатно'}</span>
        </div>
        {shipping === 'courier' && <FreeShippingMeter subtotal={totals.subtotal} />}
        <div className={`${s.row} ${s.total}`}>
          <span>Итого</span>
          <span>{formatPrice(totals.total)}</span>
        </div>

        {errorSummary && (
          <div className={s.alert} role="alert">
            {errorSummary}
          </div>
        )}
        {failed && (
          <div className={s.alert} role="alert">
            {failed}
          </div>
        )}
        <Button
          type="submit"
          form={CHECKOUT_FORM_ID}
          wide
          loading={pending}
          disabled={pending}
          className={s.sumBtn}
        >
          {submitLabel(pending)}
        </Button>
        <p className={`${text.muted} ${text.small}`}>
          Нажимая кнопку, вы ничего не оплачиваете — сначала мы подтвердим заказ.
        </p>
        <p className={s.terms}>
          <ReturnIcon size={18} />
          <span>
            {RETURN_DAYS} дней на возврат.{' '}
            <Link to={routes.help('returns')} className={s.link}>
              Условия
            </Link>
          </span>
        </p>
      </aside>

      <div className={s.bar}>
        <div>
          <div className={text.mono}>Итого</div>
          <b className={s.barTotal}>{formatPrice(totals.total)}</b>
        </div>
        <Button
          type="submit"
          form={CHECKOUT_FORM_ID}
          loading={pending}
          disabled={pending}
          className={s.barBtn}
        >
          {submitLabel(pending)}
        </Button>
      </div>
    </>
  )
}
