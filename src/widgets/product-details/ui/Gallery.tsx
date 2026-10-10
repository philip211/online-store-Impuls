import clsx from 'clsx'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import {
  Credit,
  discountLabel,
  isOnSale,
  morphNames,
  ProductImage,
  type Product,
} from '@/entities/product'
import { Badge } from '@/shared/ui'

import { photosForColor, stepIndex } from '../lib/gallery'
import { PhotoZoom } from './PhotoZoom'
import s from './product-details.module.css'

const SWIPE_PX = 40
/** The gallery is the wider of two columns from 900px, full width below. */
const MAIN_SIZES = '(min-width: 1320px) 760px, (min-width: 900px) 58vw, 100vw'
/** The stage is 4:5 (see .shotbox), so landscape photos are drawn wider than it. */
const MAIN_ASPECT = 4 / 5

/**
 * False until the page has loaded and the browser is idle, so photos that are not on screen
 * yet never compete with the LCP photo for bandwidth. Hovering or touching the gallery, a
 * thumbnail or a swatch warms it earlier through `warmUp`.
 */
function useWarm() {
  const [warm, setWarm] = useState(false)
  useEffect(() => {
    let idle: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const go = () => {
      if ('requestIdleCallback' in window) {
        idle = requestIdleCallback(() => setWarm(true), { timeout: 2000 })
      } else {
        timer = setTimeout(() => setWarm(true), 200)
      }
    }
    if (document.readyState === 'complete') go()
    else addEventListener('load', go, { once: true })
    return () => {
      removeEventListener('load', go)
      if (idle !== undefined) cancelIdleCallback(idle)
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [])
  return [warm, () => setWarm(true)] as const
}

type GalleryProps = {
  product: Product
  /** Name of the selected colour: thumbnails list its photos. */
  color: string
  activeId: string | null
  onSelect: (id: string) => void
}

/**
 * The product's photos: one large image (the page's LCP), thumbnails for the selected
 * colour, arrows and swipe to browse, a cross-fade between photos, and a full-screen view.
 */
export function Gallery({ product, color, activeId, onSelect }: GalleryProps) {
  const { images } = product
  const pool = photosForColor(images, color)
  const index = Math.max(
    0,
    pool.findIndex((img) => img.id === activeId),
  )
  const active = pool[index] ?? images[0]
  // The photo shown on arrival is the LCP: it alone loads eagerly with high priority.
  const [firstId] = useState(active?.id)
  // The photo being left fades out over the new one (see .photoOut), whether the change
  // came from here or from a colour swatch. Tracked during render, not in an effect.
  const [shownId, setShownId] = useState(active?.id)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  if (active && active.id !== shownId) {
    setLeavingId(shownId ?? null)
    setShownId(active.id)
  }
  const [zoomOpen, setZoomOpen] = useState(false)
  const [warm, warmUp] = useWarm()
  const swipeFrom = useRef<number | null>(null)
  const swiped = useRef(false)
  const morph = morphNames(product.slug)
  const label = `${product.kind} ${product.name}`

  const select = (id: string) => {
    if (id !== active?.id) onSelect(id)
  }
  const step = (d: number) => {
    const next = pool[stepIndex(index, d, pool.length)]
    if (next) select(next.id)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (pool.length < 2) return
    if (e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowLeft') step(-1)
    else return
    e.preventDefault()
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    warmUp()
    if (e.pointerType !== 'mouse') swipeFrom.current = e.clientX
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (swipeFrom.current === null) return
    const dx = e.clientX - swipeFrom.current
    swipeFrom.current = null
    if (Math.abs(dx) <= SWIPE_PX || pool.length < 2) return
    // The tap that ends a swipe must not also open the full-screen view.
    swiped.current = true
    step(dx < 0 ? 1 : -1)
  }

  const openZoom = () => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    setZoomOpen(true)
  }

  if (!active) return null
  // Only this colour's photos are mounted, plus the one fading out after a colour change.
  const leaving = leavingId ? images.find((img) => img.id === leavingId) : undefined
  const stack = leaving && !pool.some((img) => img.id === leaving.id) ? [...pool, leaving] : pool
  const position = pool.length > 1 ? `Фото ${index + 1} из ${pool.length}. ` : ''

  return (
    <div className={s.gal}>
      <div
        className={s.shotbox}
        style={{ viewTransitionName: morph.box }}
        role="group"
        aria-roledescription="галерея"
        aria-label={`${label}. ${position}${pool.length > 1 ? 'Стрелки влево и вправо листают фото' : ''}`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeFrom.current = null)}
        onPointerEnter={warmUp}
        onFocus={warmUp}
      >
        <button
          type="button"
          className={s.stage}
          style={{ viewTransitionName: morph.art }}
          onClick={openZoom}
          aria-haspopup="dialog"
          aria-label={`${active.alt}. Открыть крупно`}
        >
          {/* Photos stay mounted once shown (keyed by id), so switching photos cross-fades. */}
          {stack.map(
            (img) =>
              (warm || img.id === active.id || img.id === leavingId) && (
                <ProductImage
                  key={img.id}
                  image={img}
                  sizes={MAIN_SIZES}
                  frameAspect={MAIN_ASPECT}
                  priority={img.id === firstId}
                  decorative
                  className={clsx(
                    s.photo,
                    img.id === active.id && s.photoOn,
                    img.id === leavingId && img.id !== active.id && s.photoOut,
                  )}
                />
              ),
          )}
        </button>
        {isOnSale(product) && <Badge floating>{discountLabel(product)}</Badge>}
      </div>

      {pool.length > 1 && (
        <div
          className={s.thumbs}
          role="group"
          aria-label="Фото товара"
          onPointerEnter={warmUp}
          onFocus={warmUp}
        >
          {pool.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={clsx(s.thumb, img.id === active.id && s.on)}
              onClick={() => select(img.id)}
              aria-label={`Фото ${i + 1}: ${img.alt}`}
              aria-pressed={img.id === active.id}
            >
              <ProductImage image={img} sizes="80px" ratio="1 / 1" decorative />
            </button>
          ))}
        </div>
      )}

      <Credit credit={active.credit} className={s.credit} />

      <PhotoZoom
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        label={label}
        photos={pool}
        index={index}
        onStep={step}
      />
    </div>
  )
}
