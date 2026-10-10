import type { AuthUser } from '../common/auth'

declare global {
  namespace Express {
    interface Request {
      /** Set by AuthGuard when a valid access token is sent. */
      user?: AuthUser
    }
  }
}

export {}
