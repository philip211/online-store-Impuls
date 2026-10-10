import type { Product } from '@/entities/product'
import type { ReviewSummary } from '@/entities/review'
import { routes } from '@/shared/config'

type JsonLdInput = {
  product: Product
  categoryName: string
  /** Absolute origin, e.g. "https://impulse.store". */
  origin: string
  /** Omitted until reviews load, or when there are none. */
  rating?: Pick<ReviewSummary, 'average' | 'count'> | null
}

/** Width of the photo variant offered to search engines: large enough for rich results. */
const LD_IMAGE_WIDTH = 1200

/**
 * Absolute URL of a photo's WebP variant closest to 1200px (the largest one when the
 * original is smaller), read from its srcset.
 */
function ldImageUrl(image: Product['images'][number], origin: string): string {
  const webp = image.sources.find((src) => src.type === 'image/webp')
  const candidates = (webp?.srcSet ?? '')
    .split(',')
    .map((entry) => {
      const [url = '', w = ''] = entry.trim().split(/\s+/)
      return { url, w: Number.parseInt(w, 10) || 0 }
    })
    .filter((c) => c.url)
  const exact = candidates.find((c) => c.w === LD_IMAGE_WIDTH)
  const fitting = candidates.filter((c) => c.w <= LD_IMAGE_WIDTH).at(-1)
  const url = exact?.url ?? fitting?.url ?? image.src
  return new URL(url, origin).href
}

/** schema.org Product + BreadcrumbList for rich results. */
export function buildProductJsonLd({ product, categoryName, origin, rating }: JsonLdInput) {
  const url = `${origin}${routes.product(product.slug)}`
  // Primary shot first: search engines tend to show the first image.
  const images = [...product.images].sort(
    (a, b) => Number(b.role === 'primary') - Number(a.role === 'primary'),
  )

  const productLd = {
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.slug,
    category: categoryName,
    brand: { '@type': 'Brand', name: product.brand },
    ...(images.length > 0 ? { image: images.map((img) => ldImageUrl(img, origin)) } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'RUB',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(rating.average.toFixed(1)),
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  const crumbs = [
    { name: 'Каталог', item: `${origin}${routes.catalog()}` },
    { name: categoryName, item: `${origin}${routes.category(product.category)}` },
    { name: product.name, item: url },
  ]

  return {
    '@context': 'https://schema.org',
    '@graph': [
      productLd,
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })),
      },
    ],
  }
}

/** JSON for an inline <script>: "<" is escaped so text like "</script>" cannot close the tag. */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
