import { api, configureAuth, isApiError } from '@/shared/api'

import { useSessionStore } from '../model/session-store'
import type { AuthResponse, User } from '../model/types'

export type Credentials = { email: string; password: string }
export type Registration = Credentials & { name: string; phone?: string }

/**
 * One refresh at a time: parallel 401s, StrictMode's double effects and the startup check
 * all share it, so the rotating refresh cookie is spent once.
 */
let refreshing: Promise<string | null> | null = null

export function refreshSession(): Promise<string | null> {
  // 204 (no body) means no refresh cookie: a guest, not an error.
  refreshing ??= api<AuthResponse | undefined>('/auth/refresh', { method: 'POST', anonymous: true })
    .then((auth) => {
      if (!auth) {
        useSessionStore.getState().signOut()
        return null
      }
      useSessionStore.getState().signIn(auth)
      return auth.accessToken
    })
    .catch((e: unknown) => {
      const store = useSessionStore.getState()
      // Only the API saying the cookie is no good ends the session.
      if (isApiError(e) && (e.status === 401 || e.status === 403)) {
        store.signOut()
        return null
      }
      // Offline or the API is down: keep a live session as it is. At startup, carry on as a
      // guest for now and check again as soon as the network is back.
      if (store.status === 'unknown') {
        store.signOut()
        retryWhenOnline()
      }
      return store.accessToken
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

let retryScheduled = false

/** A visitor who opened the site offline gets their session back once it is online again. */
function retryWhenOnline() {
  if (retryScheduled || typeof window === 'undefined') return
  retryScheduled = true
  const retry = () => {
    retryScheduled = false
    window.removeEventListener('online', retry)
    if (useSessionStore.getState().status !== 'user') void refreshSession()
  }
  window.addEventListener('online', retry)
  // A server hiccup does not fire "online": try again after a pause too.
  setTimeout(retry, 30_000)
}

/** Wires the session into every API request; call once at startup. */
export function initSession() {
  configureAuth({
    token: () => useSessionStore.getState().accessToken,
    refresh: refreshSession,
  })
  // A refresh cookie from an earlier visit restores the session silently.
  void refreshSession()
}

export const sessionApi = {
  async login(body: Credentials) {
    const auth = await api<AuthResponse>('/auth/login', { method: 'POST', body, anonymous: true })
    useSessionStore.getState().signIn(auth)
    return auth.user
  },

  async register(body: Registration) {
    const auth = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body,
      anonymous: true,
    })
    useSessionStore.getState().signIn(auth)
    return auth.user
  },

  async logout() {
    try {
      await api('/auth/logout', { method: 'POST', anonymous: true })
    } finally {
      useSessionStore.getState().signOut()
    }
  },

  async updateProfile(body: { name?: string; phone?: string }) {
    const user = await api<User>('/me', { method: 'PATCH', body })
    useSessionStore.getState().setUser(user)
    return user
  },

  /** Every session ends, this one included: the caller signs in again. */
  async changePassword(body: { currentPassword: string; newPassword: string }) {
    await api('/me/password', { method: 'POST', body })
    useSessionStore.getState().signOut()
  },
}
