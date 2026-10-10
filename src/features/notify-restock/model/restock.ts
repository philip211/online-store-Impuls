import { useMutation } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api } from '@/shared/api'

export { validateEmail, type EmailCheck } from '@/shared/lib'

type RestockState = {
  /** Product id → address to notify. */
  requests: Record<number, string>
  save: (productId: number, email: string) => void
  cancel: (productId: number) => void
}

/**
 * Version 1 requests are keyed by ids from before the photo update, when product ids were
 * reassigned, so they are dropped rather than attached to other products.
 */
export function migrateRestock(
  persisted: unknown,
  version: number,
): { requests: Record<number, string> } {
  if (version < 2 || !persisted || typeof persisted !== 'object') return { requests: {} }
  const requests = (persisted as { requests?: unknown }).requests
  if (!requests || typeof requests !== 'object') return { requests: {} }
  const valid = Object.entries(requests).filter(
    ([id, email]) => Number.isInteger(Number(id)) && Number(id) > 0 && typeof email === 'string',
  )
  return { requests: Object.fromEntries(valid) as Record<number, string> }
}

export const useRestockStore = create<RestockState>()(
  persist(
    (set) => ({
      requests: {},
      save: (productId, email) => set((s) => ({ requests: { ...s.requests, [productId]: email } })),
      cancel: (productId) =>
        set((s) => ({
          requests: Object.fromEntries(
            Object.entries(s.requests).filter(([id]) => Number(id) !== productId),
          ),
        })),
    }),
    { name: 'impulse-restock', version: 2, migrate: migrateRestock },
  ),
)

/** The address this product's waitlist request was sent to, if any. */
export const useRestockRequest = (productId: number) =>
  useRestockStore((s) => s.requests[productId] ?? null)

/** The API emails the address once the product is back in stock. */
function requestRestock(input: { productId: number; email: string }) {
  return api<{ productId: number; email: string }>('/restock-subscriptions', {
    method: 'POST',
    body: input,
  })
}

export function useNotifyRestock() {
  const save = useRestockStore((s) => s.save)
  return useMutation({
    mutationFn: requestRestock,
    onSuccess: ({ productId, email }) => save(productId, email),
  })
}
