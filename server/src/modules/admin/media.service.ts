import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import sharp from 'sharp'

import { AppException, ErrorCode, unprocessable } from '../../common/errors'
import { Env, NodeEnv } from '../../config/env'
import { PrismaService } from '../../prisma/prisma.service'
import { normalizeMediaBase } from '../catalog/domain/product.mapper'

/* Same encoding as the storefront's media pipeline (scripts/build-media.mjs), so uploaded
   photos sit in the grid next to the catalogue's without looking different. */
const WIDTHS = [160, 320, 480, 800, 1200, 1600]
const QUALITY = { avif: 55, webp: 78 }
const GRADE = { saturation: 0.94 }
const PLACEHOLDER_WIDTH = 16
/** Refuse decompression bombs: 50 megapixels is far above any product shot. */
const MAX_PIXELS = 50_000_000
const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'avif', 'heif'])
/** Uploads not attached to any product this long are removed. */
const ORPHAN_AFTER_MS = 24 * 3_600_000

export type UploadedPhoto = {
  /** Files prefix relative to the uploads root: products/<uuid>/ */
  path: string
  width: number
  height: number
  widths: number[]
  placeholder: string
  dominant: string
  tone: 'light' | 'mid' | 'dark'
  /** Ready-made preview URL for the admin form. */
  src: string
}

const hex = (n: number) => n.toString(16).padStart(2, '0')

/**
 * Turns an uploaded image into the catalogue's formats: AVIF + WebP at the standard widths,
 * a blurred 16px placeholder, the average colour and the tone. The file type is decided by
 * decoding, never by the client's Content-Type, and nothing of the original is kept.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)
  private readonly root: string
  private readonly baseUrl: string

  constructor(
    private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.root = path.resolve(env.UPLOADS_DIR)
    this.baseUrl = normalizeMediaBase(env.UPLOADS_BASE_URL)
  }

  get uploadsRoot() {
    return this.root
  }

  async process(buffer: Buffer): Promise<UploadedPhoto> {
    try {
      return await this.encode(buffer)
    } catch (err) {
      if (err instanceof AppException) throw err
      // Truncated or corrupt files pass the header check and fail while decoding.
      this.logger.warn(`Upload rejected: ${err instanceof Error ? err.message : String(err)}`)
      throw this.invalid('Файл повреждён или не дочитан. Сохраните фото заново и загрузите ещё раз')
    }
  }

  private async encode(buffer: Buffer): Promise<UploadedPhoto> {
    let meta: sharp.Metadata
    try {
      meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata()
    } catch {
      throw this.invalid('Не похоже на изображение. Подойдут JPEG, PNG, WebP или AVIF')
    }
    if (!meta.format || !ACCEPTED.has(meta.format)) {
      throw this.invalid('Подойдут JPEG, PNG, WebP или AVIF')
    }

    // EXIF orientation first, then the shared light grade; flattened so the order holds.
    const graded = await sharp(buffer, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .modulate(GRADE)
      .png({ compressionLevel: 1 })
      .toBuffer({ resolveWithObject: true })
    const { width: srcW, height: srcH } = graded.info
    if (srcW < 320 || srcH < 320) {
      throw this.invalid('Фото слишком маленькое: нужно хотя бы 320 × 320 пикселей')
    }
    const base = sharp(graded.data)

    const widths = WIDTHS.filter((w) => w <= srcW)
    const rel = `products/${randomUUID()}/`
    const dir = path.join(this.root, rel)
    await mkdir(dir, { recursive: true })
    await Promise.all(
      widths.flatMap((w) =>
        (['avif', 'webp'] as const).map((format) => {
          const pipeline = base.clone().resize({ width: w, withoutEnlargement: true })
          if (format === 'avif') pipeline.avif({ quality: QUALITY.avif, effort: 4 })
          else pipeline.webp({ quality: QUALITY.webp, effort: 4 })
          return pipeline.toFile(path.join(dir, `${w}.${format}`))
        }),
      ),
    )

    const largest = widths[widths.length - 1] ?? srcW
    const placeholder = await base
      .clone()
      .resize({ width: PLACEHOLDER_WIDTH })
      .blur(0.6)
      .webp({ quality: 50 })
      .toBuffer()
    // Area-weighted average: "the colour of the photo" behind a loading image.
    const { data: rgb } = await base
      .clone()
      .resize(1, 1, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const [r = 0, g = 0, b = 0] = rgb
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b

    const fallback = widths.find((w) => w >= 800) ?? largest
    return {
      path: rel,
      width: largest,
      height: Math.round((srcH * largest) / srcW),
      widths,
      placeholder: `data:image/webp;base64,${placeholder.toString('base64')}`,
      dominant: `#${hex(r)}${hex(g)}${hex(b)}`,
      tone: luma > 170 ? 'light' : luma < 80 ? 'dark' : 'mid',
      src: `${this.baseUrl}${rel}${fallback}.webp`,
    }
  }

  /** True when an upload with this path exists (and is a directory under the uploads root). */
  async exists(rel: string): Promise<boolean> {
    const full = path.resolve(this.root, rel)
    if (!full.startsWith(this.root + path.sep)) return false
    const info = await stat(full).catch(() => null)
    return Boolean(info?.isDirectory())
  }

  /** Removes uploads that never made it into a saved product (form abandoned, photo replaced). */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async removeOrphans(): Promise<number> {
    if (this.env.NODE_ENV === NodeEnv.Test) return 0
    const dir = path.join(this.root, 'products')
    const entries = await readdir(dir).catch(() => [] as string[])
    if (!entries.length) return 0
    const used = new Set(
      (
        await this.prisma.productImage.findMany({
          where: { path: { not: null } },
          select: { path: true },
        })
      ).map((i) => i.path),
    )
    let removed = 0
    for (const name of entries) {
      if (used.has(`products/${name}/`)) continue
      const full = path.join(dir, name)
      const info = await stat(full).catch(() => null)
      if (!info?.isDirectory() || Date.now() - info.mtimeMs < ORPHAN_AFTER_MS) continue
      await rm(full, { recursive: true, force: true })
      removed++
    }
    if (removed) this.logger.log(`Removed ${removed} unused uploads`)
    return removed
  }

  private invalid(detail: string) {
    return unprocessable(ErrorCode.ValidationFailed, detail)
  }
}
