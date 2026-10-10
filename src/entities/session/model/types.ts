export type Role = 'CUSTOMER' | 'MANAGER' | 'ADMIN'

export type User = {
  id: string
  email: string
  name: string
  /** 11 digits starting with 7, or null. */
  phone: string | null
  role: Role
  createdAt: string
}

export type AuthResponse = { accessToken: string; expiresIn: number; user: User }

/** `unknown` until the silent refresh at startup answers. */
export type SessionStatus = 'unknown' | 'guest' | 'user'
