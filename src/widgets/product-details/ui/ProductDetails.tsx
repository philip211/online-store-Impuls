import clsx from 'clsx'
import { useEffect, useState } from 'react'

import { AddToCartButton } from '@/features/add-to-cart'
import { NotifyRestockForm, useRestockRequest } from '@/features/notify-restock'
import { FavoriteButton } from '@/features/toggle-favorite'
import { getImage, PriceTag, type Product } from '@/entities/product'
import { Button, Chip, ChipGroup, Container, text } from '@/shared/ui'

import { initialColorIndex, photoAfterColorChange } from '../lib/gallery'
import { Gallery } from './Gallery'
import s from './product-details.module.css'
import { PurchasePanel } from './PurchasePanel'
import { ScaleBlock } from './ScaleBlock'
import { Specs } from './Specs'

const RESTOCK_INPUT_ID = 'pd-restock-email'

/** Reset variant state per product by rendering with `key={product.id}`. */
export function ProductDetails({ product }: { product: Product }) {
  // Open on the catalogue shot and its colour, so the card morphs into the same photo.
  const [colorIndex, setColorIndex] = useState(() => initialColorIndex(product))
  const [photoId, setPhotoId] = useState(() => getImage(product)?.id ?? null)
  const [optionIndex, setOptionIndex] = useState(0)
  const restockEmail = useRestockRequest(product.id)

  const color = product.colors[colorIndex] ?? product.colors[0]
  const variant = { colorIndex, optionIndex }

  const chooseColor = (i: number) => {
    const next = product.colors[i]
    if (!next) return
    setColorIndex(i)
    setPhotoId((id) => photoAfterColorChange(product, next.name, id))
  }

  // Focusing also scrolls the waitlist form into view on phones.
  const focusRestock = () => document.getElementById(RESTOCK_INPUT_ID)?.focus()

  // Arrived from a card's "сообщим о поступлении" link (#pd-restock-email): put the
  // caret in the field once the page has settled. scroll-margin-top on the field
  // keeps it clear of the sticky header.
  useEffect(() => {
    if (product.inStock || window.location.hash !== `#${RESTOCK_INPUT_ID}`) return
    // After the route's focus handling and scroll restoration have run.
    const id = window.setTimeout(() => {
      const field = document.getElementById(RESTOCK_INPUT_ID)
      if (!field) return
      field.focus({ preventScroll: true })
      field.scrollIntoView({ block: 'start' })
    }, 150)
    return () => clearTimeout(id)
  }, [product.inStock])

  return (
    <>
      <Container className={s.pd}>
        <Gallery product={product} color={color.name} activeId={photoId} onSelect={setPhotoId} />

        <div className={s.info}>
          <div>
            <div className={text.mono}>{product.kind}</div>
            <h1 className={s.title}>{product.name}</h1>
          </div>

          <PriceTag product={product} size="lg" layout="inline" />

          <span className={clsx(s.stock, !product.inStock && s.no)}>
            <i aria-hidden="true" />
            {product.inStock ? 'В наличии' : 'Нет в наличии'}
          </span>

          {product.colors.length > 1 ? (
            <div className={s.group} role="group" aria-labelledby="pd-color">
              <p id="pd-color" className={text.mono}>
                Цвет ·{' '}
                <span key={color.name} className={s.swap}>
                  {color.name}
                </span>
              </p>
              <ChipGroup>
                {product.colors.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    className={clsx(s.sw, colorIndex === i && s.on)}
                    onClick={() => chooseColor(i)}
                    aria-label={c.name}
                    aria-pressed={colorIndex === i}
                  >
                    <span style={{ background: c.hex }} />
                  </button>
                ))}
              </ChipGroup>
            </div>
          ) : (
            <p className={text.mono}>Цвет · {color.name}</p>
          )}

          {product.options.length > 1 ? (
            <div className={s.group} role="group" aria-labelledby="pd-opt">
              <p id="pd-opt" className={text.mono}>
                {product.optionLabel}
              </p>
              <ChipGroup className={s.opts}>
                {product.options.map((name, i) => (
                  <Chip key={name} active={optionIndex === i} onClick={() => setOptionIndex(i)}>
                    {name}
                  </Chip>
                ))}
              </ChipGroup>
            </div>
          ) : (
            // Nothing to choose: state the value instead of a lone pressed pill.
            product.options[0] && (
              <p className={text.mono}>
                {product.optionLabel} · {product.options[0]}
              </p>
            )
          )}

          {product.inStock ? (
            <div className={s.buyInline}>
              <AddToCartButton product={product} variant={variant} wide />
              <FavoriteButton product={product} look="square" />
            </div>
          ) : (
            <NotifyRestockForm product={product} inputId={RESTOCK_INPUT_ID} />
          )}

          <PurchasePanel product={product} />

          <p className={s.desc}>{product.description}</p>
        </div>
      </Container>

      <Container className={s.more}>
        <ScaleBlock product={product} />
        <Specs product={product} />
      </Container>

      <div className={s.buybar}>
        <div className={s.buybarInfo}>
          <PriceTag product={product} showOld={false} />
          <div className={text.mono}>{color.name}</div>
        </div>
        <FavoriteButton product={product} look="square" />
        {product.inStock ? (
          <AddToCartButton product={product} variant={variant} className={s.buybarBtn} />
        ) : restockEmail ? (
          <span className={s.buybarNote}>Сообщим о поступлении</span>
        ) : (
          <Button
            variant="secondary"
            className={s.buybarBtn}
            onClick={focusRestock}
            aria-label="Сообщить о поступлении"
          >
            <span className={s.buybarLabel}>Уведомить</span>
          </Button>
        )}
      </div>
    </>
  )
}
