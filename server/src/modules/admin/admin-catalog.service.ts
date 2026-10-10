import { Injectable } from '@nestjs/common'

import { Prisma } from '../../../generated/prisma/client'
import { page } from '../../common/dto/pagination.dto'
import {
  conflict,
  ErrorCode,
  type FieldError,
  notFound,
  ValidationException,
} from '../../common/errors'
import { Env } from '../../config/env'
import { PrismaService, type Tx } from '../../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CatalogService } from '../catalog/catalog.service'
import {
  normalizeMediaBase,
  productInclude,
  type ProductWithRelations,
  toProduct,
} from '../catalog/domain/product.mapper'
import { RestockService } from '../subscriptions/subscriptions.service'
import { MediaService } from './media.service'
import type {
  AdminProductDto,
  AdminProductsQueryDto,
  CreateProductDto,
  ImageInputDto,
  StockDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from './dto/admin-product.dto'

const json = (v: unknown) => v as Prisma.InputJsonValue

/** Uploaded photos get numbers above any pipeline photo, so `(productId, n)` stays unique. */
const UPLOAD_N_FROM = 1000

/** Photo input → table row (without the product id). */
function imageRows(images: ImageInputDto[]) {
  return images.map(({ n, path, credit, ...img }, sortOrder) => ({
    ...img,
    n: path ? UPLOAD_N_FROM + sortOrder : (n as number),
    path: path ?? null,
    credit: credit ? json(credit) : Prisma.DbNull,
    sortOrder,
  }))
}

/**
 * Catalogue management. Every write refreshes the storefront snapshot, records an audit entry
 * and, when stock comes back, emails the "notify me" list.
 */
@Injectable()
export class AdminCatalogService {
  private readonly mediaBase: string
  private readonly uploadsBase: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly audit: AuditService,
    private readonly restock: RestockService,
    private readonly media: MediaService,
    env: Env,
  ) {
    this.mediaBase = normalizeMediaBase(env.MEDIA_BASE_URL)
    this.uploadsBase = normalizeMediaBase(env.UPLOADS_BASE_URL)
  }

  async list(q: AdminProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      ...(q.category ? { categoryId: q.category } : {}),
      ...(q.active !== undefined ? { isActive: q.active } : {}),
      ...(q.maxStock !== undefined ? { stock: { lte: q.maxStock } } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { slug: { contains: q.q.toLowerCase() } },
              { brand: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { id: 'asc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.product.count({ where }),
    ])
    return page(
      rows.map((r) => this.toDto(r)),
      total,
      q,
    )
  }

  async get(id: number): Promise<AdminProductDto> {
    const row = await this.prisma.product.findUnique({ where: { id }, include: productInclude })
    if (!row) throw notFound('Товар не найден')
    return this.toDto(row)
  }

  async create(actorId: string, dto: CreateProductDto): Promise<AdminProductDto> {
    await this.check(dto)
    const { images, colors, specs, dimensions, popularity, tags, ...fields } = dto
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...fields,
          popularity: popularity ?? 0,
          tags: tags ?? [],
          colors: json(colors),
          specs: json(specs),
          dimensions: json(dimensions),
          images: { create: imageRows(images) },
        },
        include: productInclude,
      })
      await this.audit.log(
        {
          actorId,
          action: 'product.create',
          entity: 'Product',
          entityId: created.id,
          data: { slug: created.slug },
        },
        tx,
      )
      return created
    })
    this.catalog.invalidate()
    return this.toDto(row)
  }

  async update(actorId: string, id: number, dto: UpdateProductDto): Promise<AdminProductDto> {
    const current = await this.prisma.product.findUnique({ where: { id }, include: productInclude })
    if (!current) throw notFound('Товар не найден')
    await this.check(dto, current)

    const { images, colors, specs, dimensions, ...fields } = dto
    const row = await this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } })
        await tx.productImage.createMany({
          data: imageRows(images).map((row) => ({ ...row, productId: id })),
        })
      }
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...fields,
          ...(colors ? { colors: json(colors) } : {}),
          ...(specs ? { specs: json(specs) } : {}),
          ...(dimensions ? { dimensions: json(dimensions) } : {}),
        },
        include: productInclude,
      })
      await this.afterStockChange(tx, current.stock, updated.stock, id)
      await this.audit.log(
        {
          actorId,
          action: 'product.update',
          entity: 'Product',
          entityId: id,
          data: { fields: Object.keys(dto) },
        },
        tx,
      )
      return updated
    })
    this.catalog.invalidate()
    return this.toDto(row)
  }

  async setStock(actorId: string, id: number, dto: StockDto): Promise<AdminProductDto> {
    if ((dto.stock === undefined) === (dto.delta === undefined)) {
      throw new ValidationException([
        { field: 'stock', message: 'Передайте либо stock, либо delta' },
      ])
    }
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`
      const current = await tx.product.findUnique({ where: { id } })
      if (!current) throw notFound('Товар не найден')
      const next = dto.stock ?? current.stock + (dto.delta ?? 0)
      if (next < 0)
        throw new ValidationException([
          { field: 'delta', message: `На складе только ${current.stock} шт.` },
        ])
      const updated = await tx.product.update({
        where: { id },
        data: { stock: next },
        include: productInclude,
      })
      await this.afterStockChange(tx, current.stock, next, id)
      await this.audit.log(
        {
          actorId,
          action: 'product.stock',
          entity: 'Product',
          entityId: id,
          data: { from: current.stock, to: next },
        },
        tx,
      )
      return updated
    })
    this.catalog.invalidate()
    return this.toDto(row)
  }

  /** Soft delete: the product leaves the storefront but stays in past orders. */
  async deactivate(actorId: string, id: number) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.product.updateMany({
        where: { id },
        data: { isActive: false, featuredRank: null },
      })
      if (count === 0) throw notFound('Товар не найден')
      await tx.wishlistItem.deleteMany({ where: { productId: id } })
      await tx.cartItem.deleteMany({ where: { productId: id } })
      await this.audit.log(
        { actorId, action: 'product.deactivate', entity: 'Product', entityId: id },
        tx,
      )
    })
    this.catalog.invalidate()
  }

  async categories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { products: true } } },
    })
  }

  async updateCategory(actorId: string, id: string, dto: UpdateCategoryDto) {
    if (dto.coverProductId) {
      const cover = await this.prisma.product.findFirst({
        where: { id: dto.coverProductId, categoryId: id },
      })
      if (!cover)
        throw new ValidationException([
          { field: 'coverProductId', message: 'Обложка — товар из этого раздела' },
        ])
    }
    const category = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data: dto })
      await this.audit.log(
        { actorId, action: 'category.update', entity: 'Category', entityId: id, data: { ...dto } },
        tx,
      )
      return updated
    })
    this.catalog.invalidate()
    return category
  }

  private async afterStockChange(tx: Tx, before: number, after: number, productId: number) {
    if (before === 0 && after > 0) await this.restock.notifyBackInStock([productId], tx)
  }

  /** Business rules that span fields, checked against the merged result of an update. */
  private async check(dto: UpdateProductDto, current?: ProductWithRelations) {
    const errors: FieldError[] = []
    const price = dto.price ?? current?.price
    const oldPrice = dto.oldPrice !== undefined ? dto.oldPrice : current?.oldPrice
    if (price !== undefined && oldPrice != null && oldPrice <= price) {
      errors.push({ field: 'oldPrice', message: 'Старая цена должна быть выше текущей' })
    }
    if (dto.images?.length && dto.images.filter((i) => i.role === 'primary').length !== 1) {
      errors.push({ field: 'images', message: 'Ровно одно фото с ролью primary' })
    }
    if (!current && !dto.images?.length) {
      errors.push({
        field: 'images',
        message: 'Добавьте хотя бы одно фото: без него карточка пустая',
      })
    }
    for (const [i, img] of (dto.images ?? []).entries()) {
      if (!img.path && !img.n) {
        errors.push({
          field: `images.${i}`,
          message: 'Нужен path загруженного фото или n фото из медиа-конвейера',
        })
      } else if (img.path && !(await this.media.exists(img.path))) {
        errors.push({
          field: `images.${i}.path`,
          message: 'Фото не найдено — загрузите его ещё раз',
        })
      }
    }
    const colorNames = new Set(
      (dto.colors ?? (current?.colors as { name: string }[] | undefined) ?? []).map((c) => c.name),
    )
    for (const [i, img] of (dto.images ?? []).entries()) {
      if (colorNames.size && !colorNames.has(img.color)) {
        errors.push({
          field: `images.${i}.color`,
          message: `Цвета «${img.color}» нет среди цветов товара`,
        })
      }
    }
    if (dto.colors && new Set(dto.colors.map((c) => c.name)).size !== dto.colors.length) {
      errors.push({ field: 'colors', message: 'Названия цветов повторяются' })
    }
    if (
      dto.categoryId &&
      !(await this.prisma.category.findUnique({ where: { id: dto.categoryId } }))
    ) {
      errors.push({ field: 'categoryId', message: 'Нет такого раздела' })
    }
    if (errors.length) throw new ValidationException(errors)

    if (dto.slug && dto.slug !== current?.slug) {
      const taken = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      })
      if (taken) throw conflict(ErrorCode.Conflict, 'Товар с таким slug уже есть')
    }
  }

  private toDto(row: ProductWithRelations): AdminProductDto {
    const product = toProduct(row, this.mediaBase, this.uploadsBase)
    return {
      ...product,
      photos: row.images.map((img, i) => ({
        ...(img.path ? { path: img.path } : { n: img.n }),
        role: img.role,
        color: img.color,
        alt: img.alt,
        focal: img.focal,
        tone: img.tone,
        ...(img.credit ? { credit: img.credit as unknown as ImageInputDto['credit'] } : {}),
        width: img.width,
        height: img.height,
        widths: img.widths,
        placeholder: img.placeholder,
        dominant: img.dominant,
        src: product.images[i]?.src ?? '',
      })),
      stock: row.stock,
      isActive: row.isActive,
      featuredRank: row.featuredRank,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
