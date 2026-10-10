import { useEffect, useRef } from 'react'

type Hotkey = { key: string; mod?: boolean }

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/** Physical keys to fall back on when the layout (e.g. Russian ЙЦУКЕН) types another character. */
const CODE_FALLBACK: Record<string, string> = { k: 'KeyK', '/': 'Slash' }

const matches = (e: KeyboardEvent, key: string) => {
  const k = key.toLowerCase()
  if (e.key.toLowerCase() === k) return true
  // Only when the layout produced a non-Latin character (or "." on the Slash key),
  // so Latin layouts — including Dvorak/Colemak remaps — behave exactly as before.
  const code = CODE_FALLBACK[k]
  if (!code || e.code !== code) return false
  if (k === '/') return !e.shiftKey && e.key === '.'
  return !/^[a-z]$/i.test(e.key)
}

/**
 * Global keyboard shortcut. `mod` means Ctrl on Windows/Linux and ⌘ on macOS.
 * Plain keys are ignored while the user is typing in a field.
 */
export function useHotkey(hotkeys: Hotkey[], handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })

  const signature = hotkeys.map((h) => `${h.mod ? 'mod+' : ''}${h.key}`).join(',')

  useEffect(() => {
    const list = signature.split(',').map((s) => {
      const mod = s.startsWith('mod+')
      return { mod, key: mod ? s.slice(4) : s }
    })
    const onKey = (e: KeyboardEvent) => {
      const hit = list.some(
        (h) =>
          matches(e, h.key) &&
          (h.mod ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey && !e.altKey),
      )
      if (!hit) return
      const mod = list.some((h) => h.mod && matches(e, h.key))
      if (!mod && isTyping(e.target)) return
      e.preventDefault()
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [signature])
}

export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
