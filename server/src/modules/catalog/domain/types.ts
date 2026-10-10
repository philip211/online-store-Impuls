/** Section code from the categories table: sound, mobile, photo, desk. */
export type CategoryId = string

export type ProductColor = { name: string; hex: string }

export type ProductSpec = { label: string; value: string }

/** primary: the catalogue shot; gallery: product details; context: the product in use. */
export type ImageRole = 'primary' | 'gallery' | 'context'

/** Overall brightness of a photo, so text or UI laid over it can pick a contrasting style. */
export type ImageTone = 'light' | 'mid' | 'dark'

export type PhotoCredit = {
  author: string
  authorUrl: string
  /** The photo's Unsplash page. */
  sourceUrl: string
  id: string
}

/** One photo as written by scripts/build-media.mjs (see api/media.generated.ts). */
export type GeneratedPhoto = {
  /** Files of a photo uploaded in the admin panel: `<prefix><width>.<ext>`. Absent for pipeline photos. */
  prefix?: string
  /** Number of the photo inside its product folder: files are /media/<slug>/<n>-<w>.<ext>. */
  n: number
  role: ImageRole
  /** Name of the product colour shown, matching one of `Product['colors']`. */
  color: string
  alt: string
  /** CSS object-position that keeps the product in frame when cropped. */
  focal: string
  tone: ImageTone
  /** Stock photo attribution; null for the shop's own photos. */
  credit: PhotoCredit | null
  /** Intrinsic size of the largest variant. */
  width: number
  height: number
  /** Encoded widths, ascending. */
  widths: readonly number[]
  /** Tiny blurred WebP as a data URI, shown while the photo loads. */
  placeholder: string
  /** Dominant colour, #rrggbb. */
  dominant: string
}

export type ImageSource = { type: 'image/avif' | 'image/webp'; srcSet: string }

/** A photo ready for <picture>: generated data joined with resolved URLs. */
export type ProductImage = Omit<GeneratedPhoto, 'n' | 'widths'> & {
  /** `<slug>/<n>`, unique across the catalogue. */
  id: string
  /** AVIF first, then WebP. */
  sources: ImageSource[]
  /** WebP fallback for browsers without <picture> support (a mid-size variant). */
  src: string
}

/** A product as the storefront sees it: the API response shape, shared with the frontend. */
export type Product = {
  id: number
  slug: string
  category: CategoryId
  /** Section name, also matched by search ("звук", "фото"). */
  categoryName: string
  kind: string
  name: string
  brand: string
  price: number
  oldPrice: number | null
  inStock: boolean
  /** Photos; exactly one has role 'primary'. */
  images: ProductImage[]
  colors: [ProductColor, ...ProductColor[]]
  optionLabel: string
  options: [string, ...string[]]
  description: string
  specs: ProductSpec[]
  /** Higher is more popular; drives the default sort. */
  popularity: number
  /** Use cases, attributes and synonyms for search ("для бега", "беспроводные"). */
  tags: string[]
  /** Physical size, shown "to scale" on the product page. */
  dimensions: { size: string; weight: string; compare: string }
}

export type Category = {
  id: CategoryId
  name: string
  count: number
  cover: { image: ProductImage | null }
}

export type ProductSort = 'popular' | 'price-asc' | 'price-desc'

export type ProductFilters = {
  /** Free-text search over name, kind and section. */
  query: string
  /** A section code, or 'all'. */
  category: CategoryId
  maxPrice: number | null
  inStockOnly: boolean
  sort: ProductSort
}
