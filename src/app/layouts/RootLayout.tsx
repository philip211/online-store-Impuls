import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigation, type Location } from 'react-router'

import { SearchDialog } from '@/features/search-products'
import { useAccountSync } from '@/features/sync-account'
import { useThemeSync } from '@/features/toggle-theme'
import { useToastStore } from '@/shared/lib'
import { text, Toaster } from '@/shared/ui'
import { AnnouncementBar } from '@/widgets/announcement-bar'
import { Footer } from '@/widgets/footer'
import { Header } from '@/widgets/header'

import s from './root-layout.module.css'
import { buildSiteJsonLd, serializeJsonLd } from './structured-data'

// Static per origin, so it is built once rather than on every navigation.
const SITE_JSON_LD = serializeJsonLd(buildSiteJsonLd(window.location.origin))

/**
 * Every document load starts with location.key 'default', so the stock key made
 * a freshly opened URL jump to wherever the previous page in this tab was left.
 * Keying first loads by URL keeps reload restoration and starts new pages at the top.
 */
const scrollKey = (location: Location) =>
  location.key === 'default' ? location.pathname + location.search : location.key

export function RootLayout() {
  useThemeSync()
  useAccountSync()
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const busy = navigation.state !== 'idle'
  const mainRef = useRef<HTMLElement>(null)
  const lastPath = useRef(pathname)
  const lastTitle = useRef(document.title)
  const [announcement, setAnnouncement] = useState('')

  // SPA navigation: move focus to the new page and announce it. Path changes only, so
  // filter/search params (?cat=, ?q=) and hashes keep focus where the user is.
  useEffect(() => {
    // Same path: first load (or a StrictMode re-run). The first page sets its title
    // after this mount; remember it as the baseline, but move nothing.
    if (lastPath.current === pathname) {
      const id = window.setTimeout(() => (lastTitle.current = document.title), 500)
      return () => clearTimeout(id)
    }
    lastPath.current = pathname
    // A toast belongs to the page it was raised on; its action may no longer apply here.
    useToastStore.getState().dismiss()
    const active = document.activeElement
    const pagePlacedFocus = active && active !== document.body && mainRef.current?.contains(active)
    const inDialog = active?.closest('dialog[open], [role="dialog"]')
    if (!pagePlacedFocus && !inDialog) mainRef.current?.focus({ preventScroll: true })
    // Pages set <title> as they render (lazy routes may take a moment): wait for it to
    // change, falling back to whatever it is after a second.
    const before = lastTitle.current
    const started = Date.now()
    let id = 0
    const announce = () => {
      const title = document.title
      if (title === before && Date.now() - started < 1000) {
        id = window.setTimeout(announce, 100)
        return
      }
      lastTitle.current = title
      setAnnouncement(title.replace(/ — .*$/, '') || title)
    }
    id = window.setTimeout(announce, 100)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <>
      <a href="#main" className={s.skip}>
        Перейти к содержимому
      </a>
      <p className={text.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className={clsx(s.progress, busy && s.progressOn)} aria-hidden="true" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_JSON_LD }} />
      <AnnouncementBar />
      <Header />
      {/* Keyed by path: replays the entry animation where View Transitions are unavailable. */}
      <main id="main" ref={mainRef} key={pathname} className={s.main} tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <SearchDialog />
      <Toaster />
      <ScrollRestoration getKey={scrollKey} />
    </>
  )
}
