import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

type ThemeState = { theme: Theme; toggle: () => void }

/** Storage key is read by the inline script in index.html to avoid a flash on load. */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'impulse-theme', version: 1 },
  ),
)

const THEME_COLOR: Record<Theme, string> = { dark: '#07080A', light: '#F1F2EE' }

/** Mirrors the theme onto <html data-theme> and the browser UI colour. */
export function useThemeSync() {
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])
}
