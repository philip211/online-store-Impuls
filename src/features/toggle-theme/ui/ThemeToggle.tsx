import type { MouseEvent } from 'react'

import { withViewTransition } from '@/shared/lib'
import { IconButton, MoonIcon, SunIcon } from '@/shared/ui'

import { useThemeStore } from '../model/theme-store'

/** Switches theme with a circular reveal expanding from the button (View Transitions). */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  const isLight = theme === 'light'

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    root.style.setProperty('--vt-x', `${x}px`)
    root.style.setProperty('--vt-y', `${y}px`)
    root.style.setProperty('--vt-r', `${radius}px`)
    root.classList.add('theme-vt')

    const vt = withViewTransition(() => {
      toggle()
      // Apply immediately so the "new" snapshot already has the next theme.
      root.dataset.theme = isLight ? 'dark' : 'light'
    })
    const cleanup = () => root.classList.remove('theme-vt')
    if (vt) vt.finished.finally(cleanup)
    else cleanup()
  }

  return (
    <IconButton
      label={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      onClick={onClick}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  )
}
