import clsx from 'clsx'
import { useState } from 'react'

import { AddToCartButton } from '@/features/add-to-cart'
import {
  Credit,
  discountLabel,
  getImage,
  HERO_RATIO,
  HERO_SIZES,
  isOnSale,
  ProductImage,
  type Product,
} from '@/entities/product'
import { routes } from '@/shared/config'
import { formatPrice } from '@/shared/lib'
import { ArrowRightIcon, Badge, ButtonLink, Container } from '@/shared/ui'

import s from './hero.module.css'

export function Hero({ product }: { product: Product }) {
  // Only colours that were actually photographed can be switched; a swatch that swaps
  // nothing but its label would promise a look the shopper cannot see.
  const shot = product.colors
    .map((color, index) => ({
      color,
      index,
      image: product.images.find((i) => i.color === color.name),
    }))
    .filter((c) => c.image)
  const [colorIndex, setColorIndex] = useState(shot[0]?.index ?? 0)
  const color = product.colors[colorIndex] ?? product.colors[0]
  const first = getImage(product, { role: 'primary' })
  const image = getImage(product, { role: 'primary', color: color.name }) ?? first

  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <Container className={s.inner}>
        <div className={s.copy}>
          <p className={clsx(s.kicker, s.fade)}>Предложение недели</p>
          <h1 id="hero-title" className={s.title}>
            <span className={s.ln}>
              <span>Тишина,</span>
            </span>
            <span className={clsx(s.ln, s.l2)}>
              <span>которую слышно</span>
            </span>
          </h1>
          <p className={clsx(s.lead, s.fade)}>
            {product.name}. Восемь микрофонов убирают шум метро и офиса, а заряда хватает на 30
            часов музыки.
          </p>
          <div className={clsx(s.price, s.fade)} data-numeric>
            <b>{formatPrice(product.price)}</b>
            {isOnSale(product) && (
              <>
                <s className={s.old}>{formatPrice(product.oldPrice as number)}</s>
                <Badge>{discountLabel(product)}</Badge>
              </>
            )}
          </div>
          <div className={clsx(s.cta, s.fade)}>
            <AddToCartButton product={product} variant={{ colorIndex, optionIndex: 0 }} />
            <ButtonLink to={routes.product(product.slug)} variant="secondary">
              Подробнее
              <ArrowRightIcon size={18} />
            </ButtonLink>
          </div>
        </div>

        <figure className={s.stage}>
          {image && (
            <ProductImage
              image={image}
              sizes={HERO_SIZES}
              ratio={HERO_RATIO}
              // The first photo is the LCP; a colour picked later fades in over its preview.
              priority={image === first}
              className={s.photo}
            />
          )}
          <figcaption className={s.caption}>
            {shot.length > 1 ? (
              <span className={s.swatches}>
                <span className={s.colorName}>{color.name}</span>
                <span className={s.dots} role="group" aria-label="Цвет">
                  {shot.map(({ color: c, index }) => (
                    <button
                      key={c.name}
                      type="button"
                      className={clsx(s.dot, index === colorIndex && s.dotOn)}
                      aria-label={c.name}
                      aria-pressed={index === colorIndex}
                      onClick={() => setColorIndex(index)}
                    >
                      <span style={{ background: c.hex }} />
                    </button>
                  ))}
                </span>
              </span>
            ) : (
              <span className={s.colorName}>{color.name}</span>
            )}
            {image && <Credit credit={image.credit} className={s.credit} />}
          </figcaption>
        </figure>
      </Container>
    </section>
  )
}
