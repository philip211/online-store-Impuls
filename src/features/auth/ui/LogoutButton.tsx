import { useState } from 'react'
import { useNavigate } from 'react-router'

import { sessionApi } from '@/entities/session'
import { routes } from '@/shared/config'
import { LogOutIcon } from '@/shared/ui'

import s from './auth.module.css'

/**
 * Ends the session. Clearing the device (cart, wishlist, cached personal data) happens on
 * every sign-out in features/sync-account, not only here.
 */
export function LogoutButton() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const logout = async () => {
    setBusy(true)
    try {
      await sessionApi.logout()
    } catch {
      // Offline: the session is already over on this device; the cookie expires on its own.
    } finally {
      void navigate(routes.home())
    }
  }

  return (
    <button type="button" className={s.logout} onClick={() => void logout()} disabled={busy}>
      <LogOutIcon />
      Выйти
    </button>
  )
}
