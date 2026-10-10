import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CartLine, CartLineInput } from './types'

export const MAX_QTY = 99

export const lineKey = (i: Pick<CartLineInput, 'productId' | 'colorName' | 'option'>) =>
  `${i.productId}|${i.colorName}|${i.option}`

type CartState = {
  lines: CartLine[]
  add: (input: CartLineInput) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  /** Puts a removed line back at its old position (undo). */
  restore: (line: CartLine, index: number) => void
  clear: () => void
  /** Replaces every line at once, e.g. with the account cart after sign-in. */
  replace: (lines: CartLine[]) => void
}

/** Persisted shape version; bump together with `migrateCart`. */
export const CART_VERSION = 2

/**
 * Upgrades a cart saved by an older build. Version 1 lines point at the old catalogue, whose
 * product ids were reassigned when the photo catalogue arrived (id 1 is now another product),
 * so they cannot be repaired safely and are dropped. Malformed lines are dropped as well.
 */
export function migrateCart(persisted: unknown, version: number): { lines: CartLine[] } {
  if (version < 2 || !persisted || typeof persisted !== 'object') return { lines: [] }
  const lines = (persisted as { lines?: unknown }).lines
  return { lines: Array.isArray(lines) ? lines.filter(isLine) : [] }
}

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false
  const l = value as Record<string, unknown>
  return (
    typeof l.key === 'string' &&
    typeof l.productId === 'number' &&
    typeof l.slug === 'string' &&
    typeof l.name === 'string' &&
    typeof l.kind === 'string' &&
    typeof l.price === 'number' &&
    typeof l.qty === 'number' &&
    typeof l.colorName === 'string' &&
    typeof l.option === 'string'
  )
}

const clampQty = (n: number) => Math.min(MAX_QTY, Math.max(1, Math.trunc(n)))

export const CART_STORAGE_KEY = 'impulse-cart'

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (input) =>
        set((s) => {
          const key = lineKey(input)
          const existing = s.lines.find((l) => l.key === key)
          if (existing) {
            return {
              lines: s.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + 1) } : l)),
            }
          }
          return { lines: [...s.lines, { ...input, key, qty: 1 }] }
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(qty) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      restore: (line, index) =>
        set((s) => {
          if (s.lines.some((l) => l.key === line.key)) return s
          const lines = [...s.lines]
          lines.splice(Math.min(index, lines.length), 0, line)
          return { lines }
        }),
      clear: () => set({ lines: [] }),
      replace: (lines) => set({ lines }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: CART_VERSION,
      migrate: migrateCart,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
)

/**
 * Another tab changed the cart: take its version, so a stale tab never writes old lines back
 * over newer ones (and, with an account, never sends them to the server).
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CART_STORAGE_KEY) void useCartStore.persist.rehydrate()
  })
}
