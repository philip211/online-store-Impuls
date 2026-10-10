import type { Product } from '../model/types'

export const isOnSale = (p: Pick<Product, 'price' | 'oldPrice'>) =>
  p.oldPrice !== null && p.oldPrice > p.price

/** Whole-percent discount, e.g. 13 for 32 990 vs 37 990. */
export const discountPercent = (p: Pick<Product, 'price' | 'oldPrice'>) =>
  isOnSale(p) ? Math.round((1 - p.price / (p.oldPrice as number)) * 100) : 0

export const discountLabel = (p: Pick<Product, 'price' | 'oldPrice'>) => `−${discountPercent(p)}%`
