import type { Ref } from 'react'

import { useCartStore, type CartLine } from '@/entities/cart'

import { showUndoToast } from '../model/undo'
import s from './edit-cart-line.module.css'

type RemoveLineButtonProps = {
  line: CartLine
  ref?: Ref<HTMLButtonElement>
  /** `viaKeyboard` is true for Enter/Space, so the parent can move focus to a sensible place. */
  onRemoved?: (index: number, viaKeyboard: boolean) => void
}

export function RemoveLineButton({ line, ref, onRemoved }: RemoveLineButtonProps) {
  const remove = useCartStore((st) => st.remove)
  const restore = useCartStore((st) => st.restore)

  return (
    <button
      ref={ref}
      type="button"
      className={s.rm}
      data-line-key={line.key}
      onClick={(e) => {
        const viaKeyboard = e.detail === 0
        const index = useCartStore.getState().lines.findIndex((l) => l.key === line.key)
        remove(line.key)
        onRemoved?.(index, viaKeyboard)
        // Keyboard users need time to Tab to the toast: it waits for them.
        showUndoToast(
          `${line.name} — удалён`,
          {
            label: 'Вернуть',
            onClick: () => {
              restore(line, index)
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLButtonElement>(`[data-line-key="${CSS.escape(line.key)}"]`)
                  ?.focus(),
              )
            },
          },
          viaKeyboard,
        )
      }}
      aria-label={`Удалить из корзины: ${line.name}`}
    >
      Удалить
    </button>
  )
}
