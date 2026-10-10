import { preload } from 'react-dom'

import { coverSizes } from '../lib/cover-sizes'
import { PRIMARY_PHOTOS } from './primary-photos.generated'
import { HERO_SLUG } from './product-api'

/** The hero photo column is about 58% of the container from 900px, full width below. */
export const HERO_SIZES = '(min-width: 1320px) 760px, (min-width: 900px) 58vw, 100vw'
/** The hero frame's CSS aspect-ratio. */
export const HERO_RATIO = '4 / 5'

/**
 * Starts the hero photo (the home page LCP) before the route chunk and the catalogue data
 * arrive. The hints match the hero's AVIF <source> exactly, so the browser reuses the response.
 */
export function preloadHeroImage(base: string = import.meta.env.BASE_URL) {
  const photo = PRIMARY_PHOTOS[HERO_SLUG]
  if (!photo) return
  const url = (w: number) => `${base}media/${HERO_SLUG}/${photo.n}-${w}.avif`
  const fallback = photo.widths.find((w) => w >= 1200) ?? photo.widths[photo.widths.length - 1]
  if (fallback === undefined) return
  preload(url(fallback), {
    as: 'image',
    type: 'image/avif',
    imageSrcSet: photo.widths.map((w) => `${url(w)} ${w}w`).join(', '),
    imageSizes: coverSizes(HERO_SIZES, photo.width / photo.height, 4 / 5),
    fetchPriority: 'high',
  })
}
