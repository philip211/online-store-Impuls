import type { GeneratedPhoto, ImageRole, ImageSource, Product, ProductImage } from '../model/types'

/** Width of the plain <img src> fallback: sharp enough for a card, light for old browsers. */
const FALLBACK_WIDTH = 800

const FORMATS: { ext: string; type: ImageSource['type'] }[] = [
  { ext: 'avif', type: 'image/avif' },
  { ext: 'webp', type: 'image/webp' },
]

/**
 * Joins generated photo data with resolved URLs for one product.
 * `base` is the app's public base path (Vite's BASE_URL), ending with a slash.
 */
export function joinPhotos(
  slug: string,
  photos: readonly GeneratedPhoto[],
  base = '/',
): ProductImage[] {
  return photos.map(({ n, widths, ...photo }) => {
    const url = (w: number, ext: string) => `${base}media/${slug}/${n}-${w}.${ext}`
    const fallback = widths.find((w) => w >= FALLBACK_WIDTH) ?? widths[widths.length - 1] ?? 0
    return {
      ...photo,
      id: `${slug}/${n}`,
      sources: FORMATS.map(({ ext, type }) => ({
        type,
        srcSet: widths.map((w) => `${url(w, ext)} ${w}w`).join(', '),
      })),
      src: url(fallback, 'webp'),
    }
  })
}

export type ImageQuery = { role?: ImageRole; color?: string }

/**
 * Picks the photo that best fits the request. The colour matters most (a shopper who chose
 * "Платиновый" should see it), then the role; ties go to the primary shot. Falls back to the
 * primary photo when nothing matches. Null only for a product without photos.
 */
export function getImage(
  product: Pick<Product, 'images'>,
  { role, color }: ImageQuery = {},
): ProductImage | null {
  const { images } = product
  const primary = images.find((img) => img.role === 'primary') ?? images[0] ?? null
  let best: ProductImage | null = null
  let bestScore = 0
  for (const img of images) {
    const score =
      (color !== undefined && img.color === color ? 2 : 0) +
      (role !== undefined && img.role === role ? 1 : 0)
    if (score > bestScore || (score === bestScore && score > 0 && img === primary)) {
      best = img
      bestScore = score
    }
  }
  return best ?? primary
}
