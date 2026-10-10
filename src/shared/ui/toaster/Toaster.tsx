import clsx from 'clsx'
import { useRef, type FocusEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router'

import { useToastStore } from '@/shared/lib'

import { CheckIcon } from '../icons/icons'
import { text } from '../text'
import s from './toaster.module.css'

/**
 * One always-mounted live region carries the message; the visible toast is not live,
 * so screen readers hear it once and without the action label. The toast re-mounts by id
 * so the entry animation replays, and plays a short exit before it is removed.
 */
export function Toaster() {
  const current = useToastStore((st) => st.current)
  const leaving = useToastStore((st) => st.leaving)
  const dismiss = useToastStore((st) => st.dismiss)
  const hold = useToastStore((st) => st.hold)
  // Where focus came from, so Escape can hand it back instead of dropping it on <body>.
  const returnTo = useRef<HTMLElement | null>(null)

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const from = e.relatedTarget
    if (from instanceof HTMLElement && !e.currentTarget.contains(from)) returnTo.current = from
    hold(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    const target = returnTo.current
    returnTo.current = null
    dismiss()
    if (target?.isConnected) target.focus()
    else document.getElementById('main')?.focus({ preventScroll: true })
  }

  return (
    <div>
      <p className={text.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {current && !leaving ? current.message : ''}
      </p>
      {current && (
        <div
          key={current.id}
          className={clsx(s.toast, leaving && s.leaving)}
          inert={leaving || undefined}
          onPointerEnter={() => hold(true)}
          onPointerLeave={() => hold(false)}
          onFocus={onFocus}
          onBlur={() => hold(false)}
          onKeyDown={onKeyDown}
        >
          <CheckIcon size={18} />
          <span className={s.msg}>{current.message}</span>
          {current.action &&
            (current.action.to ? (
              <Link to={current.action.to} viewTransition className={s.action} onClick={dismiss}>
                {current.action.label}
              </Link>
            ) : (
              <button
                type="button"
                className={s.action}
                onClick={() => {
                  current.action?.onClick?.()
                  dismiss()
                }}
              >
                {current.action.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
