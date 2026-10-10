import { getImage, type Product, type ProductImageData } from '@/entities/product'

/**
 * Photos to browse for a colour, primary shot first. A colour without photos of its own
 * falls back to every photo, so the gallery is never empty.
 */
export function photosForColor(
  images: readonly ProductImageData[],
  color: string,
): ProductImageData[] {
  const own = images.filter((img) => img.color === color)
  const pool = own.length > 0 ? own : [...images]
  return pool.sort((a, b) => Number(b.role === 'primary') - Number(a.role === 'primary'))
}

/** Start on the colour of the catalogue shot, so the card morphs into the same photo. */
export function initialColorIndex(product: Pick<Product, 'images' | 'colors'>): number {
  const primary = getImage(product)
  const index = product.colors.findIndex((c) => c.name === primary?.color)
  return Math.max(0, index)
}

/** The photo to show after choosing a colour: that colour's photo if one exists. */
export function photoAfterColorChange(
  product: Pick<Product, 'images'>,
  color: string,
  currentId: string | null,
): string | null {
  const match = getImage(product, { color })
  return match && match.color === color ? match.id : currentId
}

/** Index `d` steps away in a ring of `length` items. */
export const stepIndex = (index: number, d: number, length: number) =>
  length > 0 ? (((index + d) % length) + length) % length : 0
