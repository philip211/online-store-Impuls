import { useMutation } from '@tanstack/react-query'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { api } from '@/shared/api'

export { validateEmail, type EmailCheck } from '@/shared/lib'

/** Double opt-in: the API sends a confirmation email before the address is subscribed. */
function subscribe(email: string): Promise<{ email: string }> {
  return api('/newsletter', { method: 'POST', body: { email } })
}

type SubscribedState = { email: string | null; set: (email: string) => void }

export const useSubscribedStore = create<SubscribedState>()(
  persist((set) => ({ email: null, set: (email) => set({ email }) }), {
    name: 'impulse-newsletter',
    version: 1,
  }),
)

export function useSubscribe() {
  const save = useSubscribedStore((s) => s.set)
  return useMutation({ mutationFn: subscribe, onSuccess: ({ email }) => save(email) })
}
