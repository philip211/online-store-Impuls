import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'

import { queryClient } from '@/shared/api'

/**
 * Opt-in only (?devtools, or localStorage 'impulse-devtools' = '1'): the floating toggle
 * otherwise sits over the mobile cart bar and the page corners in every dev session.
 */
function wantsDevtools() {
  if (!import.meta.env.DEV) return false
  if (new URLSearchParams(window.location.search).has('devtools')) return true
  try {
    return window.localStorage.getItem('impulse-devtools') === '1'
  } catch {
    return false
  }
}

const Devtools = wantsDevtools()
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Suspense>
        <Devtools buttonPosition="bottom-left" />
      </Suspense>
    </QueryClientProvider>
  )
}
