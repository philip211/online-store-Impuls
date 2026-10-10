import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const LIMIT = 8

type RecentlyViewedState = {
  ids: number[]
  record: (id: number) => void
}

/**
 * Version 1 ids point at the catalogue before the photo update, when product ids were
 * reassigned, so they are dropped rather than shown as other products.
 */
export function migrateRecent(persisted: unknown, version: number): { ids: number[] } {
  if (version < 2 || !persisted || typeof persisted !== 'object') return { ids: [] }
  const ids = (persisted as { ids?: unknown }).ids
  if (!Array.isArray(ids)) return { ids: [] }
  const valid = ids.filter((n): n is number => Number.isInteger(n) && n > 0)
  return { ids: [...new Set(valid)].slice(0, LIMIT) }
}

/** Most recent first, de-duplicated, capped. */
export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      ids: [],
      record: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, LIMIT) })),
    }),
    { name: 'impulse-recent', version: 2, migrate: migrateRecent },
  ),
)
