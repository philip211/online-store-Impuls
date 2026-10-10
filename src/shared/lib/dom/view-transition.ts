import { flushSync } from 'react-dom'

import { prefersReducedMotion } from './motion'

/**
 * Runs a synchronous state update inside a View Transition when the browser
 * supports it, so the old and new UI cross-fade instead of snapping.
 */
export function withViewTransition(update: () => void): ViewTransition | null {
  if (typeof document === 'undefined' || !document.startViewTransition || prefersReducedMotion()) {
    update()
    return null
  }
  return document.startViewTransition(() => flushSync(update))
}
