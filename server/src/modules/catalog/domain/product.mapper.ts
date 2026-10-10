import type {
  Prisma,
  Category as CategoryRow,
  Product as ProductRow,
  ProductImage as ImageRow,
} from '../../../../generated/prisma/client'
import { joinPhotos } from './images'
import type { GeneratedPhoto, PhotoCredit, Product, ProductColor, ProductSpec } from './types'

export type ProductWithRelations = ProductRow & {
  category: Pick<CategoryRow, 'name'>
  images: ImageRow[]
}

/** Prisma include that loads everything `toProduct` needs. */
export const productInclude = {
  category: { select: { name: true } },
  images: { orderBy: [{ sortOrder: 'asc' }, { n: 'asc' }] },
} satisfies Prisma.ProductInclude

function toPhoto(img: ImageRow, uploadsBase: string): GeneratedPhoto {
  return {
    ...(img.path ? { prefix: `${uploadsBase}${img.path}` } : {}),
    n: img.n,
    role: img.role,
    color: img.color,
    alt: img.alt,
    focal: img.focal,
    tone: img.tone,
    credit: (img.credit as PhotoCredit | null) ?? null,
    width: img.width,
    height: img.height,
    widths: img.widths,
    placeholder: img.placeholder,
    dominant: img.dominant,
  }
}

/**
 * Database row → the storefront's Product. JSON columns are written only through validated
 * DTOs and the seed, so their shape is trusted here.
 */
export function toProduct(
  row: ProductWithRelations,
  mediaBase: string,
  uploadsBase = '/api/uploads/',
): Product {
  return {
    id: row.id,
    slug: row.slug,
    category: row.categoryId,
    categoryName: row.category.name,
    kind: row.kind,
    name: row.name,
    brand: row.brand,
    price: row.price,
    oldPrice: row.oldPrice,
    inStock: row.stock > 0,
    images: joinPhotos(
      row.slug,
      row.images.map((img) => toPhoto(img, uploadsBase)),
      mediaBase,
    ),
    colors: row.colors as [ProductColor, ...ProductColor[]],
    optionLabel: row.optionLabel,
    options: row.options as [string, ...string[]],
    description: row.description,
    specs: row.specs as ProductSpec[],
    popularity: row.popularity,
    tags: row.tags,
    dimensions: row.dimensions as Product['dimensions'],
  }
}

/** Media base as a prefix ending with a slash: "" → "/", "https://cdn.x" → "https://cdn.x/". */
export const normalizeMediaBase = (base: string) => (base.endsWith('/') ? base : `${base}/`)
