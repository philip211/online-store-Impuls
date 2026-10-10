import type { CartLine } from './types'
import { useCartStore } from './cart-store'

export const countItems = (lines: readonly CartLine[]) => lines.reduce((t, l) => t + l.qty, 0)
export const subtotalOf = (lines: readonly CartLine[]) =>
  lines.reduce((t, l) => t + l.price * l.qty, 0)

export const useCartLines = () => useCartStore((s) => s.lines)
export const useCartCount = () => useCartStore((s) => countItems(s.lines))
export const useCartSubtotal = () => useCartStore((s) => subtotalOf(s.lines))
