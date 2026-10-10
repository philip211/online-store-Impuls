import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { CartLine } from '@/entities/cart'
import { getImage, productQueries, type Product, type ProductImageData } from '@/entities/product'

type LineRef = Pick<CartLine, 'key' | 'productId' | 'slug' | 'colorName' | 'image'>

/**
 * The photo for one cart line: the stored photo id when it still exists, otherwise the shot
 * of the chosen colour. Null when the product is gone or the id now names another product.
 */
export function resolveLineImage(
  line: Omit<LineRef, 'key'>,
  products: readonly Product[],
): ProductImageData | null {
  const product = products.find((p) => p.id === line.productId && p.slug === line.slug)
  if (!product) return null
  const stored = line.image ? product.images.find((img) => img.id === line.image) : undefined
  return stored ?? getImage(product, { color: line.colorName })
}

/**
 * Thumbnails for cart lines, keyed by line key. Lines keep only a snapshot, so the photos are
 * looked up in the catalogue once per set of products and cached for the session.
 */
export function useLineImages(lines: readonly LineRef[]): Map<string, ProductImageData | null> {
  const idKey = [...new Set(lines.map((l) => l.productId))].sort((a, b) => a - b).join(',')
  const ids = useMemo(() => (idKey ? idKey.split(',').map(Number) : []), [idKey])
  const { data } = useQuery({ ...productQueries.byIds(ids), staleTime: Infinity })

  return useMemo(() => {
    const images = new Map<string, ProductImageData | null>()
    for (const line of lines) images.set(line.key, data ? resolveLineImage(line, data) : null)
    return images
  }, [lines, data])
}
