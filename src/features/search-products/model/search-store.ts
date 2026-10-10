import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const RECENT_LIMIT = 5

type SearchState = {
  open: boolean
  /** Bumps on every open so the panel remounts with fresh state. */
  session: number
  recent: string[]
  setOpen: (open: boolean) => void
  remember: (query: string) => void
  forget: (query: string) => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      open: false,
      session: 0,
      recent: [],
      setOpen: (open) =>
        set((s) => ({ open, session: open && !s.open ? s.session + 1 : s.session })),
      remember: (query) => {
        const q = query.trim()
        if (!q) return
        set((s) => ({
          recent: [q, ...s.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(
            0,
            RECENT_LIMIT,
          ),
        }))
      },
      forget: (query) => set((s) => ({ recent: s.recent.filter((r) => r !== query) })),
    }),
    { name: 'impulse-search', version: 1, partialize: (s) => ({ recent: s.recent }) },
  ),
)

export const openSearch = () => useSearchStore.getState().setOpen(true)
