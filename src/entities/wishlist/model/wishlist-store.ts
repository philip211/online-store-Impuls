import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WishlistState = {
  /** Product ids, newest first. */
  ids: number[]
  toggle: (id: number) => boolean
  remove: (id: number) => void
  /** Replaces the list, e.g. with the account wishlist after sign-in. */
  replace: (ids: number[]) => void
}

/**
 * Version 1 ids point at the catalogue before the photo update, when product ids were
 * reassigned (id 1 is now another product), so they are dropped rather than remapped.
 */
export function migrateWishlist(persisted: unknown, version: number): { ids: number[] } {
  if (version < 2 || !persisted || typeof persisted !== 'object') return { ids: [] }
  return { ids: productIds((persisted as { ids?: unknown }).ids) }
}

/** Positive integer ids only, deduplicated, order kept. */
function productIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((n): n is number => Number.isInteger(n) && n > 0))]
}

const WISHLIST_STORAGE_KEY = 'impulse-wishlist'

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      /** Returns true when the product ends up in the wishlist. */
      toggle: (id) => {
        const has = get().ids.includes(id)
        set((s) => ({ ids: has ? s.ids.filter((x) => x !== id) : [id, ...s.ids] }))
        return !has
      },
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      replace: (ids) => set({ ids: productIds(ids) }),
    }),
    { name: WISHLIST_STORAGE_KEY, version: 2, migrate: migrateWishlist },
  ),
)

/** Keeps open tabs in step (see the cart store). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === WISHLIST_STORAGE_KEY) void useWishlistStore.persist.rehydrate()
  })
}

export const useWishlistIds = () => useWishlistStore((s) => s.ids)
export const useWishlistCount = () => useWishlistStore((s) => s.ids.length)
export const useIsWished = (id: number) => useWishlistStore((s) => s.ids.includes(id))
