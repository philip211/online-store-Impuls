import { Injectable } from '@nestjs/common'

import { notFound } from '../../common/errors'
import { Env } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import { discountShare, isOnSale } from './domain/catalog'
import { computeFacets, type ProductFacets } from './domain/facets'
import { getImage } from './domain/images'
import { normalizeMediaBase, productInclude, toProduct } from './domain/product.mapper'
import { applyFilters, pickSimilar, searchCatalog, type SearchResult } from './domain/query'
import type { Category, Product, ProductFilters } from './domain/types'

type CategoryRow = { id: string; name: string; sortOrder: number; coverProductId: number | null }

/** Everything the storefront reads, prepared once per refresh. */
type Snapshot = {
  products: Product[]
  bySlug: Map<string, Product>
  byId: Map<number, Product>
  categories: CategoryRow[]
  featuredIds: number[]
  loadedAt: number
}

/** How long a snapshot is served before it is reloaded from the database. */
const TTL_MS = 60_000

/**
 * Storefront catalogue. The whole active catalogue is held in memory and searched with the
 * same algorithm as the frontend (typos, keyboard layout, transliteration, attribute phrases):
 * at a few thousand products this is faster than any SQL search and needs no extra service.
 *
 * Admin writes call `invalidate()` on this instance; other instances catch up within TTL_MS.
 * Past ~10k products, move search to Postgres (pg_trgm) or a search engine behind this API.
 */
@Injectable()
export class CatalogService {
  private snapshot: Snapshot | null = null
  private loading: Promise<Snapshot> | null = null
  private generation = 0
  private readonly mediaBase: string
  private readonly uploadsBase: string

  constructor(
    private readonly prisma: PrismaService,
    env: Env,
  ) {
    this.mediaBase = normalizeMediaBase(env.MEDIA_BASE_URL)
    this.uploadsBase = normalizeMediaBase(env.UPLOADS_BASE_URL)
  }

  invalidate() {
    this.snapshot = null
    // A reload already in flight read the database before this change: do not keep its result,
    // and let the next request start a fresh one.
    this.generation++
    this.loading = null
  }

  async list(filters: ProductFilters): Promise<{ items: Product[]; total: number }> {
    const { products } = await this.load()
    const items = applyFilters(products, filters)
    return { items, total: items.length }
  }

  async search(query: string, limit = 6): Promise<SearchResult> {
    const { products } = await this.load()
    return searchCatalog(products, query, limit)
  }

  async facets(filters: ProductFilters): Promise<ProductFacets> {
    const { products, categories } = await this.load()
    return computeFacets(
      products,
      filters,
      categories.map((c) => c.id),
    )
  }

  async bySlug(slug: string): Promise<Product> {
    const product = (await this.load()).bySlug.get(slug)
    if (!product) throw notFound('Товар не найден')
    return product
  }

  /** Keeps the requested order and silently drops unknown or inactive ids. */
  async byIds(ids: readonly number[]): Promise<Product[]> {
    const { byId } = await this.load()
    return ids.flatMap((id) => byId.get(id) ?? [])
  }

  async bySlugs(slugs: readonly string[]): Promise<Product[]> {
    const { bySlug } = await this.load()
    return slugs.flatMap((slug) => bySlug.get(slug) ?? [])
  }

  async similar(slug: string): Promise<Product[]> {
    const { products } = await this.load()
    return pickSimilar(products, await this.bySlug(slug))
  }

  async featured(): Promise<Product[]> {
    const { featuredIds } = await this.load()
    return this.byIds(featuredIds)
  }

  /** Discounted products, biggest discount first. */
  async deals(): Promise<Product[]> {
    const { products } = await this.load()
    return products.filter(isOnSale).sort((a, b) => discountShare(b) - discountShare(a))
  }

  async categories(): Promise<Category[]> {
    const { products, byId, categories } = await this.load()
    return categories.flatMap((c) => {
      const inCategory = products.filter((p) => p.category === c.id)
      const coverProduct =
        (c.coverProductId !== null ? byId.get(c.coverProductId) : undefined) ?? inCategory[0]
      if (!coverProduct) return []
      return {
        id: c.id,
        name: c.name,
        count: inCategory.length,
        cover: { image: getImage(coverProduct) },
      }
    })
  }

  private async load(): Promise<Snapshot> {
    if (this.snapshot && Date.now() - this.snapshot.loadedAt < TTL_MS) return this.snapshot
    // Concurrent requests share one reload instead of stampeding the database.
    const generation = this.generation
    const loading = (this.loading ??= this.fetch().finally(() => {
      if (this.loading === loading) this.loading = null
    }))
    const snapshot = await loading
    // Cache only what is not older than the latest change.
    if (generation === this.generation) this.snapshot = snapshot
    return snapshot
  }

  private async fetch(): Promise<Snapshot> {
    const [rows, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        include: productInclude,
        orderBy: { id: 'asc' },
      }),
      this.prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, name: true, sortOrder: true, coverProductId: true },
      }),
    ])
    const products = rows.map((row) => toProduct(row, this.mediaBase, this.uploadsBase))
    const featuredIds = rows
      .filter((r) => r.featuredRank !== null)
      .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0))
      .map((r) => r.id)
    return {
      products,
      bySlug: new Map(products.map((p) => [p.slug, p])),
      byId: new Map(products.map((p) => [p.id, p])),
      categories,
      featuredIds,
      loadedAt: Date.now(),
    }
  }
}
