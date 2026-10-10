import { z } from 'zod'

import type { AdminPhoto, AdminProduct, ProductInput } from '../api/admin-api'

/** Numbers are typed into text inputs; these turn them into numbers or null. */
const int = (message: string) => z.string().trim().regex(/^\d+$/, message).transform(Number)
const optionalInt = z
  .string()
  .trim()
  .regex(/^\d*$/, 'Только цифры')
  .transform((v) => (v === '' ? null : Number(v)))

const photo = z.object({
  n: z.number().optional(),
  path: z.string().optional(),
  role: z.enum(['primary', 'gallery', 'context']),
  color: z.string().min(1, 'Выберите цвет'),
  alt: z.string().trim().min(1, 'Опишите, что на фото').max(300),
  focal: z.string(),
  tone: z.enum(['light', 'mid', 'dark']),
  credit: z
    .object({ author: z.string(), authorUrl: z.string(), sourceUrl: z.string(), id: z.string() })
    .optional(),
  width: z.number(),
  height: z.number(),
  widths: z.array(z.number()),
  placeholder: z.string(),
  dominant: z.string(),
  src: z.string(),
})

/**
 * The editor's form. It validates what a manager can get wrong (the API checks everything
 * again) and its output is the request body, ready for POST or PATCH.
 */
export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Нужно название').max(160),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Латиница, цифры и дефисы: sony-wh-1000xm5')
      .max(120),
    brand: z.string().trim().min(1, 'Нужен бренд').max(60),
    kind: z.string().trim().min(1, 'Например: Наушники').max(60),
    categoryId: z.string().min(1, 'Выберите раздел'),
    price: int('Цена в рублях, целым числом').refine((v) => v > 0, 'Цена больше нуля'),
    oldPrice: optionalInt,
    stock: int('Целое число, 0 — нет в наличии'),
    optionLabel: z.string().trim().min(1, 'Например: Комплект, Память').max(60),
    /** One option per line: options may contain commas ("8 ГБ, 256 ГБ"). */
    options: z
      .string()
      .transform((v) =>
        v
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean),
      )
      .refine((v) => v.length > 0, 'Хотя бы один вариант')
      .refine((v) => v.every((o) => o.length <= 120), 'Вариант длиннее 120 символов'),
    colors: z
      .array(
        z.object({
          name: z.string().trim().min(1, 'Название цвета').max(80),
          hex: z.string().regex(/^#[0-9a-f]{6}$/i, '#rrggbb'),
        }),
      )
      .min(1, 'Хотя бы один цвет'),
    photos: z.array(photo).min(1, 'Добавьте хотя бы одно фото'),
    /** Index of the card photo among `photos`. */
    primary: z.number().int().min(0),
    specs: z.array(
      z.object({
        label: z.string().trim().min(1, 'Название').max(80),
        value: z.string().trim().min(1, 'Значение').max(300),
      }),
    ),
    size: z.string().trim().max(120),
    weight: z.string().trim().max(60),
    compare: z.string().trim().max(200),
    description: z.string().trim().max(5000),
    tags: z.string(),
    popularity: int('От 0 до 1000').refine((v) => v <= 1000, 'От 0 до 1000'),
    featuredRank: optionalInt,
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.oldPrice !== null && v.oldPrice <= v.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['oldPrice'],
        message: 'Старая цена должна быть выше текущей',
      })
    }
    const names = v.colors.map((c) => c.name.trim())
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: 'custom', path: ['colors'], message: 'Названия цветов повторяются' })
    }
    v.photos.forEach((p, i) => {
      if (p.color && !names.includes(p.color)) {
        ctx.addIssue({
          code: 'custom',
          path: ['photos', i, 'color'],
          message: 'Такого цвета у товара нет',
        })
      }
    })
  })
  .transform((v): ProductInput => ({
    slug: v.slug,
    categoryId: v.categoryId,
    kind: v.kind,
    name: v.name,
    brand: v.brand,
    price: v.price,
    oldPrice: v.oldPrice,
    stock: v.stock,
    colors: v.colors.map((c) => ({ name: c.name.trim(), hex: c.hex.toLowerCase() })),
    optionLabel: v.optionLabel,
    options: v.options,
    description: v.description,
    specs: v.specs,
    popularity: v.popularity,
    tags: v.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    dimensions: { size: v.size, weight: v.weight, compare: v.compare },
    featuredRank: v.featuredRank,
    isActive: v.isActive,
    // The chosen card photo becomes `primary`; the others keep detail / in-use roles.
    // `src` is a preview URL the API does not accept back.
    images: v.photos.map((photo, i) => {
      const { src, ...p } = photo
      void src
      return { ...p, role: i === v.primary ? 'primary' : p.role === 'primary' ? 'gallery' : p.role }
    }),
  }))

export type ProductFormValues = z.input<typeof productFormSchema>

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  slug: '',
  brand: '',
  kind: '',
  categoryId: '',
  price: '',
  oldPrice: '',
  stock: '0',
  optionLabel: 'Комплект',
  options: '',
  colors: [{ name: 'Чёрный', hex: '#1c1c1c' }],
  photos: [],
  primary: 0,
  specs: [],
  size: '',
  weight: '',
  compare: '',
  description: '',
  tags: '',
  popularity: '50',
  featuredRank: '',
  isActive: true,
}

export function toFormValues(p: AdminProduct): ProductFormValues {
  const primary = Math.max(
    0,
    p.photos.findIndex((ph) => ph.role === 'primary'),
  )
  return {
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    kind: p.kind,
    categoryId: p.category,
    price: String(p.price),
    oldPrice: p.oldPrice === null ? '' : String(p.oldPrice),
    stock: String(p.stock),
    optionLabel: p.optionLabel,
    options: p.options.join('\n'),
    colors: p.colors.map((c) => ({ ...c })),
    photos: p.photos.map((ph): AdminPhoto => ({ ...ph })),
    primary,
    specs: p.specs.map((s) => ({ ...s })),
    size: p.dimensions.size,
    weight: p.dimensions.weight,
    compare: p.dimensions.compare,
    description: p.description,
    tags: p.tags.join(', '),
    popularity: String(p.popularity),
    featuredRank: p.featuredRank === null ? '' : String(p.featuredRank),
    isActive: p.isActive,
  }
}
