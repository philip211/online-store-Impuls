import clsx from 'clsx'
import { Link } from 'react-router'

import { discountLabel, getImage, ProductImage, type Product } from '@/entities/product'
import { routes } from '@/shared/config'
import { formatPrice } from '@/shared/lib'
import { ArrowRightIcon, Badge, ButtonLink, Container, text } from '@/shared/ui'

import s from './deals-banner.module.css'

/** Thumbnails are 80–96px wide; ProductImage widens this for photos cropped to the 4:5 frame. */
const THUMB_SIZES = '96px'

/**
 * Reduced prices, stated plainly. Each discount is measured against the lowest
 * price of the last 30 days (Omnibus-style), and that reference is shown.
 */
export function DealsBanner({ products }: { products: Product[] }) {
  const top = products.filter((p) => p.oldPrice != null).slice(0, 4)
  if (!top.length) return null

  return (
    <section className={s.section} aria-labelledby="h-deals">
      <Container className={s.layout}>
        <div className={s.copy}>
          <h2 id="h-deals" className={s.title}>
            Специальные цены
          </h2>
          <p className={s.lead}>
            Модели, которые сейчас стоят меньше обычного. Скидку считаем от самой низкой цены за
            последние 30 дней.
          </p>
          <ButtonLink to={routes.catalog()} variant="secondary" size="sm">
            Весь каталог
            <ArrowRightIcon size={16} />
          </ButtonLink>
        </div>

        <ul className={s.list}>
          {top.map((p) => {
            const image = getImage(p)
            return (
              <li key={p.id} className={text.reveal}>
                <Link to={routes.product(p.slug)} viewTransition className={s.item}>
                  {image ? (
                    <ProductImage
                      image={image}
                      sizes={THUMB_SIZES}
                      ratio="4 / 5"
                      decorative
                      className={s.thumb}
                    />
                  ) : (
                    <span className={clsx(s.thumb, s.blank)} aria-hidden="true" />
                  )}
                  <span className={s.itemMain}>
                    <span className={s.itemName}>{p.name}</span>
                    <span className={text.mono}>{p.kind}</span>
                  </span>
                  <span className={s.itemPrice}>
                    <b>
                      <span className={text.srOnly}>Цена со скидкой: </span>
                      {formatPrice(p.price)}
                    </b>
                    <span className={s.was}>
                      <s>
                        <span className={text.srOnly}>Прежняя цена: </span>
                        {formatPrice(p.oldPrice ?? p.price)}
                      </s>
                      <Badge>{discountLabel(p)}</Badge>
                    </span>
                  </span>
                  <span className={clsx(text.mono, s.reference)}>
                    Самая низкая цена за 30 дней: {formatPrice(p.oldPrice ?? p.price)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Container>
    </section>
  )
}
