import { create } from 'zustand'

export type ToastAction =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never }

export type Toast = { id: number; message: string; action?: ToastAction }

type ToastOptions = { action?: ToastAction; duration?: number }

type ToastState = {
  current: Toast | null
  /** True while the current toast plays its exit; it is removed when that ends. */
  leaving: boolean
  show: (message: string, options?: ToastOptions) => void
  dismiss: () => void
  /** Pauses auto-dismiss while the pointer or focus is on the toast. */
  hold: (held: boolean) => void
}

/** Matches --dur-base, the exit transition in toaster.module.css. */
const EXIT_MS = 240

let timer: ReturnType<typeof setTimeout> | undefined
let leaveTimer: ReturnType<typeof setTimeout> | undefined
let remaining = 0
let seq = 0

const schedule = (ms: number, done: () => void) => {
  clearTimeout(timer)
  remaining = ms
  timer = setTimeout(done, ms)
}

export const useToastStore = create<ToastState>()((set, get) => {
  // A timer, not transitionend: removal still happens under reduced motion or in a background tab.
  const close = () => {
    clearTimeout(timer)
    if (!get().current || get().leaving) return
    set({ leaving: true })
    clearTimeout(leaveTimer)
    leaveTimer = setTimeout(() => set({ current: null, leaving: false }), EXIT_MS)
  }

  return {
    current: null,
    leaving: false,
    show: (message, { action, duration } = {}) => {
      // A new toast replaces a leaving one at once; the new key replays the entry.
      clearTimeout(leaveTimer)
      set({ current: { id: ++seq, message, action }, leaving: false })
      // Actionable toasts stay longer so there is time to react.
      schedule(duration ?? (action ? 5000 : 2400), close)
    },
    dismiss: close,
    hold: (held) => {
      if (!get().current || get().leaving) return
      if (held) clearTimeout(timer)
      else schedule(Math.max(remaining, 1500), close)
    },
  }
})

export const toast = (message: string, options?: ToastOptions) =>
  useToastStore.getState().show(message, options)
