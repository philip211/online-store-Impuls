import type { CategoryId, Product } from '@/entities/product'

import { BUDGETS, type CompleteAnswers, type FinderPref, type FinderUse } from './answers'

export type FinderPick = {
  product: Product
  /** One line for "Почему подходит". */
  reason: string
  /** How much over the declared budget, in roubles; 0 when it fits. */
  overBudget: number
}

type UseSignals = { categories: CategoryId[]; tags: string[] }

/** What makes a product relevant to each use case. */
const USE_SIGNALS: Record<FinderUse, UseSignals> = {
  music: {
    categories: ['sound'],
    tags: ['для метро', 'для путешествий', 'для перелётов', 'шумоподавление', 'для улицы'],
  },
  sport: {
    categories: [],
    tags: ['для спорта', 'для бега', 'фитнес', 'для плавания', 'пульс', 'gps', 'сон'],
  },
  work: {
    categories: ['desk'],
    tags: ['для работы', 'для офиса', 'для программирования', 'для ноутбука'],
  },
  photo: {
    categories: ['photo'],
    tags: ['для фото', 'в подарок', 'для творчества', 'моментальная печать'],
  },
  reading: { categories: [], tags: ['для чтения', 'электронная книга', 'e-ink'] },
}

const USE_FALLBACK: Record<FinderUse, string> = {
  music: 'Подходит для музыки в дороге',
  sport: 'Подходит для тренировок и следит за здоровьем',
  work: 'Подходит для работы и учёбы',
  photo: 'Подходит для снимков на память и в подарок',
  reading: 'Подходит для долгого чтения',
}

const spec = (p: Product, ...labels: string[]) =>
  p.specs.find((sp) => labels.includes(sp.label))?.value ?? null

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "до 30 часов" → 30, "до 10 недель" → 1680; null when the text has no duration. */
export function parseHours(value: string): number | null {
  const m = /(\d+(?:[.,]\d+)?)\s*(час|дн|нед)/i.exec(value)
  if (!m?.[1] || !m[2]) return null
  const n = Number(m[1].replace(',', '.'))
  const unit = m[2].toLowerCase()
  return unit === 'час' ? n : unit === 'дн' ? n * 24 : n * 24 * 7
}

/** "250 г" → 250, "1,2 кг" → 1200. */
export function parseGrams(value: string): number | null {
  // \b is ASCII-only, so the unit's end is checked with a Cyrillic lookahead.
  const m = /(\d+(?:[.,]\d+)?)\s*(кг|г)(?![а-яё])/i.exec(value)
  if (!m?.[1] || !m[2]) return null
  const n = Number(m[1].replace(',', '.'))
  return m[2].toLowerCase() === 'кг' ? n * 1000 : n
}

export function relevance(p: Product, use: FinderUse): number {
  const { categories, tags } = USE_SIGNALS[use]
  const tagHits = tags.filter((t) => p.tags.includes(t)).length
  return (categories.includes(p.category) ? 3 : 0) + tagHits
}

/** 0–3: how well the product answers "что важнее". */
export function prefScore(p: Product, pref: FinderPref): number {
  switch (pref) {
    case 'battery': {
      if (spec(p, 'Ёмкость')) return 3
      const hours = parseHours(spec(p, 'Работа от батареи') ?? '')
      if (hours === null) return spec(p, 'Батарея') ? 1 : 0
      return hours >= 30 ? 3 : hours >= 15 ? 2 : 1
    }
    case 'sound':
      if (p.category !== 'sound') return 0
      return p.tags.includes('шумоподавление') || p.tags.includes('стерео') ? 3 : 2
    case 'compact': {
      const grams = parseGrams(p.dimensions.weight)
      const base = grams === null ? 0 : grams <= 50 ? 3 : grams <= 250 ? 2 : grams <= 350 ? 1 : 0
      return Math.min(3, base + Number(p.tags.includes('компактный')))
    }
    case 'screen': {
      const hits = [spec(p, 'Экран'), spec(p, 'Камера', 'Размер снимка')].filter(Boolean).length
      return Math.min(3, hits + Number(p.tags.includes('для фото')))
    }
  }
}

/** A concrete fact from the product data that answers the declared priority. */
function prefFact(p: Product, pref: FinderPref): string | null {
  switch (pref) {
    case 'battery': {
      const capacity = spec(p, 'Ёмкость')
      if (capacity) return `${capacity} — хватит, чтобы зарядить ноутбук в дороге`
      const life = spec(p, 'Работа от батареи')
      return life ? `${capitalize(life)} без подзарядки` : null
    }
    case 'sound':
      if (p.tags.includes('шумоподавление')) return 'Активное шумоподавление глушит метро и офис'
      if (p.tags.includes('стерео')) return 'Объёмный стереозвук на 360 градусов'
      return p.category === 'sound' ? 'Громкий чистый звук без проводов' : null
    case 'compact':
      return prefScore(p, 'compact') > 0
        ? `Весит ${p.dimensions.weight} — ${p.dimensions.compare}`
        : null
    case 'screen': {
      const screen = spec(p, 'Экран')
      const camera = spec(p, 'Камера')
      if (screen && camera) return `Экран ${screen}, камера ${camera}`
      if (screen) return `Экран ${screen}`
      const print = spec(p, 'Размер снимка')
      return print ? `Печатает снимок ${print} прямо в руках` : null
    }
  }
}

export function reasonFor(p: Product, a: Pick<CompleteAnswers, 'use' | 'pref'>): string {
  return prefFact(p, a.pref) ?? USE_FALLBACK[a.use]
}

const budgetMax = (budget: CompleteAnswers['budget']) =>
  BUDGETS.find((b) => b.value === budget)?.max ?? null

/**
 * Top picks for the answers. Only products relevant to the use case are suggested;
 * the budget is a hard limit unless nothing fits, in which case the closest-priced
 * relevant products are shown and marked as over budget — never silently upsold.
 */
export function recommend(
  products: readonly Product[],
  answers: CompleteAnswers,
  limit = 3,
): FinderPick[] {
  const max = budgetMax(answers.budget)
  const rank = (p: Product) =>
    relevance(p, answers.use) * 10 +
    prefScore(p, answers.pref) * 6 +
    (p.inStock ? 15 : 0) +
    p.popularity / 100

  const relevant = products.filter((p) => relevance(p, answers.use) > 0)
  const fitting = relevant.filter((p) => max === null || p.price <= max)

  const chosen = fitting.length
    ? [...fitting].sort((x, y) => rank(y) - rank(x))
    : [...relevant].sort((x, y) => x.price - y.price || rank(y) - rank(x))

  return chosen.slice(0, limit).map((p) => ({
    product: p,
    reason: reasonFor(p, answers),
    overBudget: max === null ? 0 : Math.max(0, p.price - max),
  }))
}
