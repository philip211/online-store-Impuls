import catalog from '../../prisma/seed-data/catalog.json'
import { joinPhotos } from '../../src/modules/catalog/domain/images'
import type { GeneratedPhoto, Product } from '../../src/modules/catalog/domain/types'

type SeedProduct = Omit<Product, 'images' | 'categoryName'> & {
  images: GeneratedPhoto[]
  featuredRank: number | null
}

const names = new Map(catalog.categories.map((c) => [c.id, c.name]))

/** The seed catalogue as the API serves it: the fixture for pure search and facet tests. */
export const PRODUCTS: readonly Product[] = (catalog.products as unknown as SeedProduct[]).map(
  ({ featuredRank: _, images, ...p }) => ({
    ...p,
    categoryName: names.get(p.category) ?? p.category,
    images: joinPhotos(p.slug, images, '/'),
  }),
)

export const CATEGORY_IDS = catalog.categories.map((c) => c.id)
