import clsx from 'clsx'
import { Link, NavLink } from 'react-router'

import { ThemeToggle } from '@/features/toggle-theme'
import { useCartCount } from '@/entities/cart'
import { isStaff, useUser } from '@/entities/session'
import { CATEGORY_IDS, CATEGORY_NAMES } from '@/entities/product'
import { useWishlistCount } from '@/entities/wishlist'
import { routes, type HelpTopicId } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ArrowRightIcon, CloseIcon, Dialog, IconButton, text } from '@/shared/ui'

import s from './mobile-menu.module.css'

type MobileMenuProps = { open: boolean; onClose: () => void }

/** The service questions people ask most; "Все вопросы" below opens the help index. */
const HELP_LINKS: { id: HelpTopicId; label: string }[] = [
  { id: 'delivery', label: 'Доставка' },
  { id: 'order-status', label: 'Статус заказа' },
  { id: 'returns', label: 'Возврат' },
  { id: 'contacts', label: 'Связаться' },
]

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const cart = useCartCount()
  const wished = useWishlistCount()
  const user = useUser()

  const link = (to: string, label: string, meta?: number, end?: boolean) => (
    <NavLink
      to={to}
      end={end}
      viewTransition
      onClick={onClose}
      className={({ isActive }) => clsx(s.link, isActive && s.on)}
    >
      <span>{label}</span>
      {meta ? (
        <>
          <span className={s.meta} aria-hidden="true">
            {meta}
          </span>
          <span className={text.srOnly}>, {pluralize(meta, ITEM_FORMS)}</span>
        </>
      ) : (
        <ArrowRightIcon size={18} />
      )}
    </NavLink>
  )

  return (
    <Dialog open={open} onClose={onClose} variant="sheet" label="Меню">
      <div className={s.head}>
        <span className={s.logo}>Импульс</span>
        <IconButton label="Закрыть меню" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <nav className={s.body} aria-label="Мобильная навигация">
        {link(routes.home(), 'Главная', undefined, true)}
        {link(routes.catalog(), 'Каталог', undefined, true)}
        {link(routes.finder(), 'Подбор техники')}

        <p className={clsx(text.mono, s.group)}>Категории</p>
        {CATEGORY_IDS.map((id) => (
          // Link, not NavLink: NavLink ignores ?cat=, so every category would read as current.
          <Link
            key={id}
            to={`${routes.catalog()}?cat=${id}`}
            viewTransition
            onClick={onClose}
            className={s.sub}
          >
            {CATEGORY_NAMES[id]}
          </Link>
        ))}

        <p className={clsx(text.mono, s.group)}>Мои</p>
        {link(routes.favorites(), 'Избранное', wished)}
        {link(routes.cart(), 'Корзина', cart)}
        {user ? link(routes.account(), 'Кабинет') : link(routes.login(), 'Войти')}
        {isStaff(user) && link(routes.admin(), 'Управление')}

        <p className={clsx(text.mono, s.group)}>Помощь</p>
        {HELP_LINKS.map(({ id, label }) => (
          <NavLink
            key={id}
            to={routes.help(id)}
            viewTransition
            onClick={onClose}
            className={({ isActive }) => clsx(s.sub, isActive && s.subOn)}
          >
            {label}
          </NavLink>
        ))}
        <NavLink
          to={routes.help()}
          end
          viewTransition
          onClick={onClose}
          className={({ isActive }) => clsx(s.sub, isActive && s.subOn)}
        >
          Все вопросы
        </NavLink>
      </nav>

      <div className={s.foot}>
        <span>Тема оформления</span>
        <ThemeToggle />
      </div>
    </Dialog>
  )
}
