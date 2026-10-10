import { routes } from '@/shared/config'

/** One slash, then anything but another slash or a backslash. */
const SAME_SITE_PATH = /^\/(?![/\\])/

/**
 * Where to go after signing in. Only paths of this site: `?next=https://evil.example` and
 * `?next=/\evil.example` (which browsers read as "//evil.example") must not become an open
 * redirect.
 */
export function safeNext(value: string | null): string {
  return value && SAME_SITE_PATH.test(value) ? value : routes.account()
}
