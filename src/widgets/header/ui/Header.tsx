import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { SearchTrigger } from '@/features/search-products'
import { ThemeToggle } from '@/features/toggle-theme'
import { useCartCount } from '@/entities/cart'
import { useUser } from '@/entities/session'
import { useWishlistCount } from '@/entities/wishlist'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import {
  BagIcon,
  Container,
  HeartIcon,
  IconButton,
  IconLink,
  MenuIcon,
  UserIcon,
} from '@/shared/ui'

import s from './header.module.css'
import { MobileMenu } from './MobileMenu'

/** Bumps the badge when the count grows — timed to land with the fly-to-cart dot. */
function useBump(count: number) {
  const [bump, setBump] = useState(false)
  const prev = useRef(count)

  useEffect(() => {
    const grew = count > prev.current
    prev.current = count
    if (!grew) return
    const on = setTimeout(() => setBump(true), 520)
    const off = setTimeout(() => setBump(false), 900)
    return () => {
      clearTimeout(on)
      clearTimeout(off)
    }
  }, [count])

  return bump
}

/** Adds a hairline shadow once the page scrolls under the sticky header. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

function Count({ value, bump }: { value: number; bump?: boolean }) {
  if (value <= 0) return null
  return (
    <span className={clsx(s.count, bump && s.bump)} aria-hidden="true">
      {value > 99 ? '99+' : value}
    </span>
  )
}

export function Header() {
  const count = useCartCount()
  const wished = useWishlistCount()
  const user = useUser()
  const bump = useBump(count)
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const inCatalog = pathname.startsWith('/catalog') || pathname.startsWith('/product')

  return (
    <header className={clsx(s.hdr, scrolled && s.scrolled)}>
      <Container className={s.inner}>
        <Link
          to={routes.home()}
          viewTransition
          className={s.logo}
          aria-label="Импульс — на главную"
        >
          Импульс
        </Link>

        <nav className={s.nav} aria-label="Основная навигация">
          <NavLink
            to={routes.home()}
            end
            viewTransition
            className={({ isActive }) => clsx(s.link, isActive && s.on)}
          >
            Главная
          </NavLink>
          <NavLink
            to={routes.catalog()}
            viewTransition
            className={clsx(s.link, inCatalog && s.on)}
            aria-current={inCatalog ? 'page' : undefined}
          >
            Каталог
          </NavLink>
          <NavLink
            to={routes.finder()}
            viewTransition
            className={({ isActive }) => clsx(s.link, isActive && s.on)}
          >
            Подбор
          </NavLink>
          <NavLink
            to={routes.help()}
            viewTransition
            className={({ isActive }) => clsx(s.link, isActive && s.on)}
          >
            Помощь
          </NavLink>
        </nav>

        <span className={s.sp} />

        <div className={s.actions}>
          <SearchTrigger />
          <IconLink
            to={routes.favorites()}
            label={wished ? `Избранное, ${pluralize(wished, ITEM_FORMS)}` : 'Избранное'}
            className={s.desktopOnly}
          >
            <HeartIcon />
            <Count value={wished} />
          </IconLink>
          <span className={s.desktopOnly}>
            <ThemeToggle />
          </span>
          <IconLink
            to={user ? routes.account() : routes.login()}
            label={user ? `Кабинет — ${user.name}` : 'Войти'}
            className={s.desktopOnly}
          >
            <UserIcon />
          </IconLink>
          <IconLink
            to={routes.cart()}
            label={count ? `Корзина, ${pluralize(count, ITEM_FORMS)}` : 'Корзина пуста'}
          >
            <BagIcon />
            <Count value={count} bump={bump} />
          </IconLink>
          <IconButton
            label="Меню"
            className={s.mobileOnly}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </div>
      </Container>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
