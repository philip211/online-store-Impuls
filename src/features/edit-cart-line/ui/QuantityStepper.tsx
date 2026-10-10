import { MAX_QTY, useCartStore, type CartLine } from '@/entities/cart'
import { MinusIcon, PlusIcon } from '@/shared/ui'

import s from './edit-cart-line.module.css'

export function QuantityStepper({ line }: { line: CartLine }) {
  const setQty = useCartStore((st) => st.setQty)

  return (
    <div className={s.qty} role="group" aria-label={`Количество: ${line.name}`}>
      <button
        type="button"
        onClick={() => setQty(line.key, line.qty - 1)}
        disabled={line.qty <= 1}
        aria-label={`Уменьшить количество: ${line.name}`}
      >
        <MinusIcon size={18} />
      </button>
      <output aria-live="polite">{line.qty}</output>
      <button
        type="button"
        onClick={() => setQty(line.key, line.qty + 1)}
        disabled={line.qty >= MAX_QTY}
        aria-label={`Увеличить количество: ${line.name}`}
      >
        <PlusIcon size={18} />
      </button>
    </div>
  )
}
