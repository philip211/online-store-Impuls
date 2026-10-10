import { Link } from 'react-router'

import { openSearch } from '@/features/search-products'
import { SubscribeForm } from '@/features/subscribe-newsletter'
import { CATEGORY_IDS, CATEGORY_NAMES } from '@/entities/product'
import { RETURN_DAYS, routes, SUPPORT, type HelpTopicId } from '@/shared/config'
import { prefersReducedMotion } from '@/shared/lib'
import { Container } from '@/shared/ui'

import s from './footer.module.css'

const PAYMENTS = ['Мир', 'Visa', 'Mastercard', 'СБП']

// Short labels for the footer; full titles live in HELP_TOPICS.
const SERVICE_LINKS: { id: HelpTopicId; label: string }[] = [
  { id: 'delivery', label: 'Доставка' },
  { id: 'returns', label: 'Возврат' },
  { id: 'warranty', label: 'Гарантия' },
  { id: 'payment', label: 'Оплата' },
  { id: 'order-status', label: 'Статус заказа' },
  { id: 'seller', label: 'Сведения о продавце' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={s.ftr}>
      <Container>
        <div className={s.cta}>
          <div>
            <p className={s.eyebrow}>Рассылка</p>
            <h2 className={s.ctaTitle}>Новинки и специальные цены — раз в неделю</h2>
          </div>
          <SubscribeForm />
        </div>

        <div className={s.cols}>
          <div className={s.brand}>
            <Link to={routes.home()} viewTransition className={s.logo}>
              Импульс
            </Link>
            <p className={s.tagline}>
              Техника, которую мы выбрали бы себе. Официальная гарантия и {RETURN_DAYS} дней на
              возврат.
            </p>
            <address className={s.contacts}>
              <a href={SUPPORT.phoneHref}>{SUPPORT.phone}</a>
              <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
              <a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
              <span>{SUPPORT.hours}</span>
            </address>
          </div>

          <nav aria-labelledby="f-catalog">
            <h3 id="f-catalog" className={s.colTitle}>
              Каталог
            </h3>
            <ul className={s.links}>
              {CATEGORY_IDS.map((id) => (
                <li key={id}>
                  <Link to={`${routes.catalog()}?cat=${id}`} viewTransition>
                    {CATEGORY_NAMES[id]}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={routes.catalog()} viewTransition>
                  Все товары
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="f-me">
            <h3 id="f-me" className={s.colTitle}>
              Покупателям
            </h3>
            <ul className={s.links}>
              <li>
                <button type="button" onClick={openSearch}>
                  Поиск товаров
                </button>
              </li>
              <li>
                <Link to={routes.favorites()} viewTransition>
                  Избранное
                </Link>
              </li>
              <li>
                <Link to={routes.cart()} viewTransition>
                  Корзина
                </Link>
              </li>
              <li>
                <Link to={routes.help('contacts')} viewTransition>
                  Связаться с нами
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="f-service">
            <h3 id="f-service" className={s.colTitle}>
              Сервис
            </h3>
            <ul className={s.links}>
              {SERVICE_LINKS.map((l) => (
                <li key={l.id}>
                  <Link to={routes.help(l.id)} viewTransition>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={routes.help()} viewTransition>
                  Все вопросы
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className={s.bottom}>
          <ul className={s.pay} aria-label="Способы оплаты">
            {PAYMENTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className={s.legal}>
            © {year} Импульс. Демонстрационный магазин — цены, отзывы и реквизиты условные.
          </p>
          <button
            type="button"
            className={s.top}
            onClick={() =>
              window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
            }
          >
            Наверх
          </button>
        </div>
      </Container>
    </footer>
  )
}
