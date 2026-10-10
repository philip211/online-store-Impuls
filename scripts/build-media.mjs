#!/usr/bin/env node
/**
 * Builds responsive catalogue imagery from media/catalog-images.json.
 *
 * For every photo it writes public/media/<slug>/<n>-<w>.avif|webp at the standard widths
 * (never upscaled, aspect kept, metadata stripped, one light grade for the whole catalogue plus an
 * optional per-photo `grade` and `crop` from the manifest),
 * then emits src/entities/product/api/media.generated.ts with dimensions, a tiny blurred
 * placeholder and the dominant colour, plus media/CREDITS.md.
 *
 * Usage: npm run media            (skips variants that are newer than their source)
 *        npm run media -- --force (re-encodes everything)
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as prettier from 'prettier'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = path.join(ROOT, 'media/catalog-images.json')
const OUT_DIR = path.join(ROOT, 'public/media')
const TS_OUT = path.join(ROOT, 'src/entities/product/api/media.generated.ts')
/** Tiny index of primary photos for the entry bundle (preloading the hero before the data). */
const PRIMARY_OUT = path.join(ROOT, 'src/entities/product/api/primary-photos.generated.ts')
const CREDITS_OUT = path.join(ROOT, 'media/CREDITS.md')

/** 160–320 serve thumbnails (search, cart, gallery strip); 480+ serve cards and the gallery. */
const WIDTHS = [160, 320, 480, 800, 1200, 1600]
const QUALITY = { avif: 55, webp: 78 }
/** One light, shared grade: a touch less saturation so stock photos read as one shoot. */
const GRADE = { saturation: 0.94 }
const PLACEHOLDER_WIDTH = 16
/**
 * Target band for card (primary) photos, so the grid reads as one shoot: mean Rec.709 luma and
 * the spread of the mean RGB channels. Gallery and context photos may be more varied.
 */
const PRIMARY_BAND = { minLuma: 45, maxLuma: 175, maxChroma: 30 }
const GRADE_KEYS = new Set(['brightness', 'saturation', 'linear', 'wb'])

const ROLES = new Set(['primary', 'gallery', 'context'])
const TONES = new Set(['light', 'mid', 'dark'])
const FOCAL = /^\d{1,3}% \d{1,3}%$/

const force = process.argv.includes('--force')

const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

function validate(manifest) {
  const errors = []
  const slugs = new Set()
  for (const product of manifest.products) {
    if (slugs.has(product.slug)) errors.push(`${product.slug}: duplicate slug`)
    slugs.add(product.slug)
    const primaries = product.images.filter((img) => img.role === 'primary').length
    if (primaries !== 1) errors.push(`${product.slug}: needs exactly one primary, has ${primaries}`)
    for (const img of product.images) {
      const at = `${product.slug} ${img.file}`
      if (!ROLES.has(img.role)) errors.push(`${at}: unknown role ${img.role}`)
      if (!TONES.has(img.tone)) errors.push(`${at}: unknown tone ${img.tone}`)
      if (!FOCAL.test(img.focal)) errors.push(`${at}: focal must look like "50% 50%"`)
      if (!img.alt?.trim()) errors.push(`${at}: alt text is required`)
      if (!img.credit?.author || !img.credit?.sourceUrl) errors.push(`${at}: credit is incomplete`)
      if (!existsSync(path.join(ROOT, img.file))) errors.push(`${at}: file not found`)
      if (img.grade !== undefined) {
        const g = img.grade
        const bad = Object.keys(g).filter((k) => !GRADE_KEYS.has(k))
        if (bad.length) errors.push(`${at}: unknown grade keys ${bad.join(', ')}`)
        for (const k of ['brightness', 'saturation']) {
          if (g[k] !== undefined && !(g[k] > 0 && g[k] < 3))
            errors.push(`${at}: grade.${k} out of range`)
        }
        if (g.linear !== undefined && !(Array.isArray(g.linear) && g.linear.length === 2)) {
          errors.push(`${at}: grade.linear must be [multiplier, offset]`)
        }
        if (g.wb !== undefined && !(Array.isArray(g.wb) && g.wb.length === 3)) {
          errors.push(`${at}: grade.wb must be [r, g, b] multipliers`)
        }
      }
      if (img.crop !== undefined) {
        const c = img.crop
        const ints = ['left', 'top', 'width', 'height'].every(
          (k) => Number.isInteger(c[k]) && c[k] >= 0,
        )
        if (!ints || c.width < 1 || c.height < 1) {
          errors.push(`${at}: crop needs integer left, top, width, height`)
        }
      }
    }
  }
  if (errors.length) throw new Error('Invalid manifest:\n  ' + errors.join('\n  '))
}

async function isFresh(target, sourceMtime) {
  if (force) return false
  try {
    return (await stat(target)).mtimeMs >= sourceMtime
  } catch {
    return false
  }
}

/** Number of the image inside its product folder: media/originals/<slug>/<n>.jpg → n. */
const indexOf = (file) => Number(path.basename(file, path.extname(file)))

async function buildImage(slug, img) {
  const source = path.join(ROOT, img.file)
  const n = indexOf(img.file)
  if (!Number.isInteger(n) || n < 1) throw new Error(`${img.file}: name the file <n>.jpg`)

  // A changed grade or crop must re-encode the photo even when the source file is unchanged.
  const settings = JSON.stringify({
    grade: img.grade ?? null,
    crop: img.crop ?? null,
    GRADE,
    QUALITY,
  })
  const settingsChanged = settingsCache[img.file] !== settings
  settingsCache[img.file] = settings
  const sourceMtime = settingsChanged ? Infinity : (await stat(source)).mtimeMs
  const meta = await sharp(source).metadata()
  // EXIF orientations 5–8 rotate by 90°, swapping the stored width and height.
  const turned = (meta.orientation ?? 1) >= 5
  const fullW = turned ? meta.height : meta.width
  const fullH = turned ? meta.width : meta.height
  const crop = img.crop
  if (crop && (crop.left + crop.width > fullW || crop.top + crop.height > fullH)) {
    throw new Error(`${img.file}: crop falls outside the ${fullW}x${fullH} source`)
  }
  const srcW = crop ? crop.width : fullW
  const srcH = crop ? crop.height : fullH

  // rotate() applies EXIF orientation before the metadata is dropped. The crop is applied to the
  // upright image, then the catalogue grade, then the photo's own grade.
  // Each step is flattened to a buffer so sharp applies them in this order.
  let pipeline = sharp(source).rotate()
  if (crop) pipeline = sharp(await pipeline.extract(crop).toBuffer())
  pipeline = sharp(await pipeline.modulate(GRADE).toBuffer())
  const g = img.grade
  if (g) {
    if (g.linear) pipeline = sharp(await pipeline.linear(g.linear[0], g.linear[1]).toBuffer())
    if (g.brightness !== undefined || g.saturation !== undefined) {
      pipeline = sharp(
        await pipeline
          .modulate({ brightness: g.brightness ?? 1, saturation: g.saturation ?? 1 })
          .toBuffer(),
      )
    }
    if (g.wb) {
      const [r, gr, b] = g.wb
      pipeline = sharp(
        await pipeline
          .recomb([
            [r, 0, 0],
            [0, gr, 0],
            [0, 0, b],
          ])
          .toBuffer(),
      )
    }
  }
  const base = sharp(await pipeline.png({ compressionLevel: 1 }).toBuffer())

  const widths = WIDTHS.filter((w) => w <= srcW)
  if (!widths.length) widths.push(srcW)

  const dir = path.join(OUT_DIR, slug)
  await mkdir(dir, { recursive: true })
  const written = []
  await Promise.all(
    widths.flatMap((w) =>
      ['avif', 'webp'].map(async (format) => {
        const target = path.join(dir, `${n}-${w}.${format}`)
        written.push(path.basename(target))
        if (await isFresh(target, sourceMtime)) return
        const pipeline = base.clone().resize({ width: w, withoutEnlargement: true })
        if (format === 'avif') pipeline.avif({ quality: QUALITY.avif, effort: 5 })
        else pipeline.webp({ quality: QUALITY.webp, effort: 5 })
        await pipeline.toFile(target)
      }),
    ),
  )

  const largest = widths[widths.length - 1]
  const height = Math.round((srcH * largest) / srcW)

  const placeholder = await base
    .clone()
    .resize({ width: PLACEHOLDER_WIDTH })
    .blur(0.6)
    .webp({ quality: 50 })
    .toBuffer()
  // The area-weighted average reads as "the colour of the photo" behind a loading image;
  // sharp's histogram dominant picks a bin and lands on near-black for dark products.
  const { data: rgb } = await base
    .clone()
    .resize(1, 1, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const dominant = { r: rgb[0], g: rgb[1], b: rgb[2] }

  const luma = Math.round(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2])
  const chroma = Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2])

  return {
    stats: { luma, chroma },
    record: {
      n,
      role: img.role,
      color: img.color,
      alt: img.alt,
      focal: img.focal,
      tone: img.tone,
      credit: img.credit,
      width: largest,
      height,
      widths,
      placeholder: `data:image/webp;base64,${placeholder.toString('base64')}`,
      dominant: hex(dominant),
    },
    written,
  }
}

/** Removes variants left over from photos that were dropped or renumbered. */
async function prune(slug, keep) {
  const dir = path.join(OUT_DIR, slug)
  for (const file of await readdir(dir)) {
    if (!keep.has(file)) await rm(path.join(dir, file))
  }
}

async function pruneProducts(slugs) {
  if (!existsSync(OUT_DIR)) return
  for (const entry of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !slugs.has(entry.name)) {
      await rm(path.join(OUT_DIR, entry.name), { recursive: true })
    }
  }
}

async function writeTs(media) {
  const source = `// generated by scripts/build-media.mjs — do not edit
// Source: media/catalog-images.json. Run \`npm run media\` after changing photos.
import type { GeneratedPhoto } from '../model/types'

/** Widths every photo is encoded at (smaller originals stop at their own width). */
export const MEDIA_WIDTHS = ${JSON.stringify(WIDTHS)} as const

/** Photos per product slug, in manifest order. Files: /media/<slug>/<n>-<w>.avif|webp */
export const MEDIA: Readonly<Record<string, readonly GeneratedPhoto[]>> = ${JSON.stringify(media)}
`
  const config = (await prettier.resolveConfig(TS_OUT)) ?? {}
  const formatted = await prettier.format(source, { ...config, filepath: TS_OUT })
  await writeFile(TS_OUT, formatted)

  const primary = Object.fromEntries(
    Object.entries(media).map(([slug, records]) => {
      const { n, width, height, widths } = records.find((r) => r.role === 'primary')
      return [slug, { n, width, height, widths }]
    }),
  )
  const index = `// generated by scripts/build-media.mjs — do not edit
// Source: media/catalog-images.json. Small enough for the entry bundle, unlike MEDIA.

/** The primary photo of each product: file number, intrinsic size and encoded widths. */
export const PRIMARY_PHOTOS: Readonly<
  Record<string, { n: number; width: number; height: number; widths: readonly number[] }>
> = ${JSON.stringify(primary)}
`
  await writeFile(PRIMARY_OUT, await prettier.format(index, { ...config, filepath: PRIMARY_OUT }))
}

async function writeCredits(manifest) {
  const lines = [
    '# Photo credits',
    '',
    '<!-- generated by scripts/build-media.mjs — do not edit -->',
    '',
    'Every product photo comes from Unsplash and is used under the',
    '[Unsplash License](https://unsplash.com/license): free to use, no permission needed,',
    'attribution appreciated. Photos are resized, re-encoded and very lightly desaturated',
    `(saturation × ${GRADE.saturation}) for a consistent look. A few are also cropped or`,
    'individually graded (exposure, saturation, white balance) so the catalogue reads as one shoot.',
    '',
    '| Product | Photo | Role | Author | Unsplash page | License |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const product of manifest.products) {
    for (const img of product.images) {
      const { author, authorUrl, sourceUrl, id } = img.credit
      lines.push(
        `| ${product.name.replaceAll('|', '\\|')} | \`${img.file}\` | ${img.role} | [${author}](${authorUrl}) | [${id}](${sourceUrl}) | Unsplash License (https://unsplash.com/license) |`,
      )
    }
  }
  const count = manifest.products.reduce((sum, p) => sum + p.images.length, 0)
  lines.push('', `${count} photos across ${manifest.products.length} products.`, '')
  await writeFile(CREDITS_OUT, lines.join('\n'))
}

/** Grade/crop settings each original was last encoded with, so edits re-encode only that photo. */
const SETTINGS_CACHE = path.join(ROOT, 'node_modules/.cache/build-media.json')
let settingsCache = {}

async function main() {
  const started = Date.now()
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
  try {
    settingsCache = JSON.parse(await readFile(SETTINGS_CACHE, 'utf8'))
  } catch {
    settingsCache = {}
  }
  validate(manifest)
  const outOfBand = []

  const media = {}
  let count = 0
  for (const product of manifest.products) {
    const records = []
    const keep = new Set()
    for (const img of product.images) {
      const { record, written, stats } = await buildImage(product.slug, img)
      if (
        img.role === 'primary' &&
        (stats.luma < PRIMARY_BAND.minLuma ||
          stats.luma > PRIMARY_BAND.maxLuma ||
          stats.chroma > PRIMARY_BAND.maxChroma)
      ) {
        outOfBand.push(`${img.file}: luma ${stats.luma}, chroma ${stats.chroma}`)
      }
      records.push(record)
      written.forEach((f) => keep.add(f))
      count++
      process.stdout.write(`\r${count} photos processed`)
    }
    await prune(product.slug, keep)
    media[product.slug] = records
  }
  await pruneProducts(new Set(manifest.products.map((p) => p.slug)))
  await writeTs(media)
  await mkdir(path.dirname(SETTINGS_CACHE), { recursive: true })
  await writeFile(SETTINGS_CACHE, JSON.stringify(settingsCache, null, 2))
  await writeCredits(manifest)
  if (outOfBand.length) {
    const { minLuma, maxLuma, maxChroma } = PRIMARY_BAND
    console.warn(
      `\nPrimary photos outside the band (luma ${minLuma}–${maxLuma}, chroma ≤ ${maxChroma}):\n  ` +
        outOfBand.join('\n  '),
    )
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(
    `\nDone in ${seconds}s: public/media, ${path.relative(ROOT, TS_OUT)}, media/CREDITS.md`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
