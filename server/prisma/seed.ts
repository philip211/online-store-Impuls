/**
 * Fills the database with the storefront catalogue, reviews and the first administrator.
 * Idempotent: re-running updates catalogue rows in place and never duplicates anything.
 * Run: `npm run db:seed`.
 */
import 'dotenv/config'

import { createHash } from 'node:crypto'

import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'argon2'

import { PrismaClient, type Prisma } from '../generated/prisma/client'
import catalog from './seed-data/catalog.json'
import reviews from './seed-data/reviews.json'

type SeedPhoto = {
  n: number
  role: 'primary' | 'gallery' | 'context'
  color: string
  alt: string
  focal: string
  tone: 'light' | 'mid' | 'dark'
  credit: Prisma.InputJsonValue
  width: number
  height: number
  widths: number[]
  placeholder: string
  dominant: string
}

type SeedProduct = {
  id: number
  slug: string
  category: string
  kind: string
  name: string
  brand: string
  price: number
  oldPrice: number | null
  inStock: boolean
  colors: Prisma.InputJsonValue
  optionLabel: string
  options: string[]
  description: string
  specs: Prisma.InputJsonValue
  popularity: number
  tags: string[]
  dimensions: Prisma.InputJsonValue
  featuredRank: number | null
  images: SeedPhoto[]
}

type SeedReview = {
  id: string
  author: string
  rating: number
  date: string
  helpful: number
  text: string
}

/** Stock given to products marked "in stock" in the storefront data. */
const DEFAULT_STOCK = 12

/** Seed reviews get stable UUIDs, so re-seeding updates them instead of adding copies. */
const reviewUuid = (key: string) => {
  const h = createHash('sha256').update(key).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

  try {
    for (const c of catalog.categories) {
      const data = { name: c.name, sortOrder: c.sortOrder, coverProductId: c.coverProductId }
      await prisma.category.upsert({
        where: { id: c.id },
        create: { id: c.id, ...data },
        update: data,
      })
    }

    for (const p of catalog.products as unknown as SeedProduct[]) {
      const { images, inStock, category, id, ...fields } = p
      const data = { ...fields, categoryId: category }
      await prisma.$transaction(async (tx) => {
        await tx.product.upsert({
          where: { id },
          create: { id, ...data, stock: inStock ? DEFAULT_STOCK : 0 },
          // Re-seeding refreshes descriptive data but keeps the live stock level.
          update: data,
        })
        await tx.productImage.deleteMany({ where: { productId: id } })
        await tx.productImage.createMany({
          data: images.map((img, sortOrder) => ({ ...img, productId: id, sortOrder })),
        })
      })
    }
    // Explicit ids were inserted: move the sequence past them for products created later.
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX(id) FROM "Product"))`,
    )

    // Reviews are grouped by section in the storefront data: attach each to a product there,
    // round-robin, so every section shows them.
    const products = await prisma.product.findMany({
      select: { id: true, categoryId: true },
      orderBy: { id: 'asc' },
    })
    for (const [categoryId, list] of Object.entries(reviews as Record<string, SeedReview[]>)) {
      const targets = products.filter((p) => p.categoryId === categoryId)
      for (const [i, r] of list.entries()) {
        const target = targets[i % targets.length]
        if (!target) continue
        const date = new Date(`${r.date}T12:00:00+03:00`)
        const data = {
          productId: target.id,
          author: r.author,
          rating: r.rating,
          text: r.text,
          helpful: r.helpful,
          status: 'PUBLISHED' as const,
          verified: true,
          createdAt: date,
          publishedAt: date,
        }
        const id = reviewUuid(`seed-${r.id}`)
        await prisma.review.upsert({ where: { id }, create: { id, ...data }, update: data })
      }
    }

    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
    const password = process.env.SEED_ADMIN_PASSWORD
    if (email && password) {
      await prisma.user.upsert({
        where: { email },
        create: { email, name: 'Администратор', role: 'ADMIN', passwordHash: await hash(password) },
        update: { role: 'ADMIN' },
      })
      console.log(`Admin: ${email}`)
    }

    const counts = await Promise.all([
      prisma.product.count(),
      prisma.productImage.count(),
      prisma.review.count(),
    ])
    console.log(`Seeded ${counts[0]} products, ${counts[1]} images, ${counts[2]} reviews`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
