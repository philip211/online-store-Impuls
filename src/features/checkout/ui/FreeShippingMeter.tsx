import { FREE_SHIPPING_FROM } from '@/shared/config'
import { formatPrice } from '@/shared/lib'
import { TruckIcon } from '@/shared/ui'

import s from './checkout.module.css'

/** Shows how far the cart is from free courier delivery. */
export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const left = Math.max(0, FREE_SHIPPING_FROM - subtotal)
  const progress = Math.min(1, subtotal / FREE_SHIPPING_FROM)

  return (
    <div className={s.meter}>
      <p className={s.meterText} aria-live="polite">
        <TruckIcon size={18} />
        {left > 0 ? (
          <span>
            До бесплатной доставки — <b>{formatPrice(left)}</b>
          </span>
        ) : (
          <span>Курьер — бесплатно</span>
        )}
      </p>
      <div
        className={s.track}
        role="progressbar"
        aria-label="Прогресс до бесплатной доставки"
        aria-valuemin={0}
        aria-valuemax={FREE_SHIPPING_FROM}
        aria-valuenow={Math.min(subtotal, FREE_SHIPPING_FROM)}
      >
        <span className={s.fill} style={{ transform: `scaleX(${progress})` }} />
      </div>
    </div>
  )
}
