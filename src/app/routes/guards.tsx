import { Navigate, Outlet, useLocation } from 'react-router'

import { NotFoundPage } from '@/pages/not-found'
import { isStaff, useSessionStatus, useUser } from '@/entities/session'
import { routes } from '@/shared/config'

import { PageFallback } from '../layouts/PageFallback'

/**
 * Personal routes. While the silent refresh at startup is in flight the page waits rather
 * than bouncing a signed-in visitor to the login form.
 */
export function RequireUser() {
  const status = useSessionStatus()
  const { pathname, search } = useLocation()
  if (status === 'unknown') return <PageFallback />
  if (status === 'guest') return <Navigate to={routes.login(pathname + search)} replace />
  return <Outlet />
}

/**
 * Staff routes. A customer gets the ordinary 404: the admin area does not announce itself.
 * The API checks the role on every request regardless; this only keeps the UI honest.
 */
export function RequireStaff() {
  const status = useSessionStatus()
  const user = useUser()
  const { pathname, search } = useLocation()
  if (status === 'unknown') return <PageFallback />
  if (status === 'guest') return <Navigate to={routes.login(pathname + search)} replace />
  if (!isStaff(user)) return <NotFoundPage />
  return <Outlet />
}

/** Administrators only (people and the audit log). */
export function RequireAdmin() {
  const user = useUser()
  return user?.role === 'ADMIN' ? <Outlet /> : <NotFoundPage />
}
