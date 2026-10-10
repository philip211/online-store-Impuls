import { create } from 'zustand'

import type { AuthResponse, SessionStatus, User } from './types'

type SessionState = {
  status: SessionStatus
  user: User | null
  /** Kept in memory only: a script injected into the page cannot read it from storage. */
  accessToken: string | null
  signIn: (auth: AuthResponse) => void
  setUser: (user: User) => void
  signOut: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  user: null,
  accessToken: null,
  signIn: ({ accessToken, user }) => set({ status: 'user', accessToken, user }),
  setUser: (user) => set({ user }),
  signOut: () => set({ status: 'guest', accessToken: null, user: null }),
}))

export const useSessionStatus = () => useSessionStore((s) => s.status)
export const useUser = () => useSessionStore((s) => s.user)

export const isStaff = (user: User | null) => user?.role === 'MANAGER' || user?.role === 'ADMIN'
export const useIsStaff = () => useSessionStore((s) => isStaff(s.user))
export const useIsAdmin = () => useSessionStore((s) => s.user?.role === 'ADMIN')
