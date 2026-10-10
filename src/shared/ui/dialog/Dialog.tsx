import clsx from 'clsx'
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'

import s from './dialog.module.css'

type DialogProps = {
  open: boolean
  onClose: () => void
  /**
   * `sheet` slides in from the side, `palette` drops from the top,
   * `bottom` rises from the bottom edge (mobile filters, quick choices).
   */
  variant?: 'sheet' | 'palette' | 'bottom'
  label: string
  className?: string
  children: ReactNode
}

type Drag = { y: number; t: number; dy: number }

/** Share of the sheet's height, or a flick speed (px/ms), past which a drag dismisses it. */
const DISMISS_RATIO = 0.3
const DISMISS_VELOCITY = 0.5

/**
 * Native <dialog> as a modal: free focus trap, Esc to close, inert background
 * and top-layer stacking. Entry/exit are pure CSS (@starting-style).
 * The bottom sheet can also be dragged down by its handle (or any `[data-drag]`
 * area a consumer marks); the close button stays the accessible way out.
 */
export function Dialog({
  open,
  onClose,
  variant = 'sheet',
  label,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      // Forget where a previous drag left the sheet before it enters again.
      el.style.removeProperty('transform')
      el.style.removeProperty('transition')
      el.style.removeProperty('--drag')
      el.showModal()
    }
    if (!open && el.open) el.close()
  }, [open])

  const onPointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    const el = ref.current
    const target = e.target as Element
    if (variant !== 'bottom' || !el || e.button !== 0) return
    if (!target.closest('[data-drag]') || target.closest('button, a, input, select, textarea'))
      return
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
    el.setPointerCapture(e.pointerId)
    el.style.transition = 'none'
  }

  const onPointerMove = (e: PointerEvent<HTMLDialogElement>) => {
    const el = ref.current
    const d = drag.current
    if (!el || !d) return
    // Follows the finger downward only: no upward overdrag, no rubber band.
    d.dy = Math.max(0, e.clientY - d.y)
    el.style.transform = `translateY(${d.dy}px)`
    el.style.setProperty('--drag', String(1 - d.dy / el.offsetHeight))
  }

  const onPointerEnd = () => {
    const el = ref.current
    const d = drag.current
    if (!el || !d) return
    drag.current = null
    if (d.dy > 3) {
      // The pointer was captured by the <dialog>, so the click that follows would read as a backdrop tap.
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
    }
    const velocity = d.dy / Math.max(1, performance.now() - d.t)
    el.style.removeProperty('transition')
    el.style.removeProperty('--drag')
    if (d.dy > el.offsetHeight * DISMISS_RATIO || (d.dy > 24 && velocity > DISMISS_VELOCITY)) {
      // Continue from where the finger let go to the closed position, then close.
      el.style.transform = 'translateY(100%)'
      onClose()
      return
    }
    // Not far enough: settle back (instant under reduced motion via the global rule).
    el.style.transition = 'transform var(--dur-base) var(--ease-out)'
    el.style.removeProperty('transform')
    setTimeout(() => el.style.removeProperty('transition'), 300)
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={clsx(s.dialog, s[variant], className)}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // A click that lands on the <dialog> itself (not its content) is on the backdrop.
      onClick={(e) => !suppressClick.current && e.target === e.currentTarget && onClose()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {variant === 'bottom' && (
        <div className={s.grab} data-drag>
          <span className={s.handle} aria-hidden="true" />
        </div>
      )}
      {/* Content stays mounted so the exit transition has something to animate. */}
      <div className={s.body}>{children}</div>
    </dialog>
  )
}
