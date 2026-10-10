import { CATEGORY_NAMES } from '../model/catalog'
import type { Product, ProductFilters } from '../model/types'
import { bestMatch, meaningfulWords, queryWords, tokenize, type WordMatch } from './fuzzy'

/*
 * Search understands three kinds of input (Baymard: most stores fail the last two):
 * - product words, with typos, wrong keyboard layout and transliteration;
 * - attributes: colours, "до 10 000 ₽", "в наличии";
 * - use cases from product tags: "для бега", "в подарок".
 * Every word must match something (AND); better fields rank higher. A word that names some
 * products directly (name, kind) does not also pull in products that only share a section
 * name with it, and results far weaker than the best one are dropped.
 */

type Field = { weight: number; tokens: string[] }

// name > kind > tags > section > colour names
const WEIGHTS = { name: 5, kind: 4, tags: 3, category: 2, colors: 1.5 }
/** Field strength, strongest first; a match may be at most one tier below the best one. */
const TIERS = [WEIGHTS.name, WEIGHTS.kind, WEIGHTS.tags, WEIGHTS.category, WEIGHTS.colors]
const tierOf = (weight: number) => TIERS.indexOf(weight)
/** Results scoring under this share of the best one are noise ("осмо" → iPad via a typo). */
const MIN_SHARE = 0.4

const indexCache = new WeakMap<Product, Field[]>()

function fieldsOf(p: Product): Field[] {
  let fields = indexCache.get(p)
  if (!fields) {
    fields = [
      { weight: WEIGHTS.name, tokens: tokenize(p.name) },
      { weight: WEIGHTS.kind, tokens: tokenize(p.kind) },
      { weight: WEIGHTS.tags, tokens: tokenize(p.tags.join(' ')) },
      { weight: WEIGHTS.category, tokens: tokenize(CATEGORY_NAMES[p.category]) },
      { weight: WEIGHTS.colors, tokens: tokenize(p.colors.map((c) => c.name).join(' ')) },
    ]
    indexCache.set(p, fields)
  }
  return fields
}

/* Colours */

type ColorFamily = { stems: string[]; names: string[] }

// Query stems → colour-name stems that satisfy them (marketing names included).
const COLOR_FAMILIES: ColorFamily[] = [
  { stems: ['черн', 'black'], names: ['черн', 'графит', 'обсидиан', 'ноч'] },
  { stems: ['бел', 'white'], names: ['бел', 'молочн', 'фарфор', 'кремов'] },
  { stems: ['сер', 'grey', 'gray'], names: ['сер', 'серебрист', 'графит', 'платин'] },
  { stems: ['серебрист', 'silver'], names: ['серебрист', 'платин'] },
  { stems: ['син', 'blue'], names: ['син', 'голуб'] },
  { stems: ['голуб'], names: ['голуб'] },
  { stems: ['красн', 'red'], names: ['красн'] },
  { stems: ['зелен', 'green'], names: ['зелен', 'мятн'] },
  { stems: ['розов', 'pink'], names: ['розов'] },
  { stems: ['молочн', 'кремов', 'бежев'], names: ['молочн', 'кремов', 'фарфор', 'звезд'] },
]

const ADJ_ENDING = /^(?:ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его|ую|юю|ых|их|ым|им|ыми|ими)?$/

function colorFamily(word: string): ColorFamily | null {
  return (
    COLOR_FAMILIES.find((f) =>
      f.stems.some((stem) =>
        /[a-z]/.test(stem)
          ? word === stem
          : word.startsWith(stem) && ADJ_ENDING.test(word.slice(stem.length)),
      ),
    ) ?? null
  )
}

const hasColor = (p: Product, family: ColorFamily) =>
  p.colors.some((c) =>
    tokenize(c.name).some((t) => family.names.some((stem) => t.startsWith(stem))),
  )

/* Price and stock phrases */

const PRICE_PHRASE =
  /(не дороже|дешевле|меньше|ниже|до|дороже|от)\s*(\d{1,3}(?:\s\d{3})+|\d+)\s*(тысяч[аи]?|тыс\.?|т\.?|к|k)?\s*(?:₽|руб(?:лей|ля|\.)?|р\.?)?(?=\s|$)/g
const STOCK_PHRASE = /(?:есть\s+)?(?:в\s+)?наличи[еия](?=\s|$)/g

type Spelling = { spelling: string; penalty: number }

type PlannedWord = {
  /** Every spelling that matches somewhere in the catalogue, each with its rank penalty. */
  variants: Spelling[]
  partial: boolean
  /** Strongest field tier this word reaches in any product (0 = name). */
  bestTier: number
}

type Plan = {
  words: PlannedWord[]
  colors: ColorFamily[]
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean
  correctedQuery: string | null
  /** Some word matches nothing anywhere: the result is empty. */
  impossible: boolean
}

/** Penalty for a spelling we had to guess (layout, transliteration). */
const VARIANT_PENALTY = 0.8

type Found = { match: WordMatch; quality: number }
const better = (a: Found | null, b: Found | null): Found | null =>
  b && (!a || b.quality > a.quality) ? b : a

type ProductMatch = WordMatch & { score: number; weight: number }

function bestInProduct(p: Product, spelling: string, partial: boolean): ProductMatch | null {
  let best: ProductMatch | null = null
  for (const f of fieldsOf(p)) {
    const m = bestMatch(spelling, f.tokens, partial)
    if (m && (!best || m.quality * f.weight > best.score))
      best = { ...m, score: m.quality * f.weight, weight: f.weight }
  }
  return best
}

/** The best of a word's spellings in one product, penalty applied. */
function bestWordMatch(p: Product, w: PlannedWord) {
  let best: (ProductMatch & { spelling: string }) | null = null
  for (const { spelling, penalty } of w.variants) {
    const m = bestInProduct(p, spelling, w.partial)
    if (m && (!best || m.score * penalty > best.score)) {
      best = { ...m, score: m.score * penalty, spelling }
    }
  }
  return best
}

/**
 * Turns a query into constraints and resolves each word against the given products. Every
 * spelling that matches somewhere is kept, so "пиксель 9 про" can match "пиксель" as typed and
 * "про" as "pro". A correction is offered only when the spelling as typed matched nothing,
 * or matched only through a typo.
 */
function plan(products: readonly Product[], query: string): Plan {
  let text = query.toLocaleLowerCase('ru').replaceAll('ё', 'е')
  let minPrice: number | null = null
  let maxPrice: number | null = null

  text = text.replace(PRICE_PHRASE, (_, op: string, num: string, unit: string | undefined) => {
    let value = Number(num.replace(/\s/g, ''))
    if (unit && value < 1000) value *= 1000
    if (op === 'от' || op === 'дороже') minPrice = Math.max(minPrice ?? 0, value)
    else maxPrice = Math.min(maxPrice ?? Infinity, value)
    return ' '
  })
  let inStock = false
  text = text.replace(STOCK_PHRASE, () => {
    inStock = true
    return ' '
  })

  const colors: ColorFamily[] = []
  const words: Plan['words'] = []
  const fixes = new Map<string, string>()
  let impossible = false

  for (const w of meaningfulWords(queryWords(text))) {
    const family = colorFamily(w.typed)
    if (family) {
      colors.push(family)
      continue
    }

    const variants: Spelling[] = []
    let bestTier = TIERS.length
    // Best match of a spelling read as typed, and of one we had to guess.
    let asTyped: Found | null = null
    let guessed: Found | null = null
    for (const spelling of w.variants) {
      const same = w.same.includes(spelling)
      const penalty = same ? 1 : VARIANT_PENALTY
      let matched = false
      for (const p of products) {
        const m = bestInProduct(p, spelling, w.partial)
        if (!m) continue
        matched = true
        // Only whole words and prefixes set the bar: "book" inside "macbook" says little.
        if (m.kind === 'exact' || m.kind === 'prefix')
          bestTier = Math.min(bestTier, tierOf(m.weight))
        const found = { match: m, quality: m.quality * penalty }
        if (same) asTyped = better(asTyped, found)
        else guessed = better(guessed, found)
      }
      if (matched) variants.push({ spelling, penalty })
    }
    if (!variants.length) {
      impossible = true
      break
    }
    words.push({ variants, partial: w.partial, bestTier })
    if (asTyped) {
      // Found as typed: suggest only when that took a typo fix, and offer the best spelling.
      if (asTyped.match.kind === 'fuzzy')
        fixes.set(w.raw, (better(asTyped, guessed) ?? asTyped).match.token)
    } else if (guessed && (guessed.match.kind === 'exact' || guessed.match.kind === 'fuzzy')) {
      // A fragment ("100" inside "1000xm5") is not something the user meant to type.
      fixes.set(w.raw, guessed.match.token)
    }
  }

  let correctedQuery: string | null = null
  if (!impossible && fixes.size) {
    const typed = query.toLocaleLowerCase('ru').replaceAll('ё', 'е').split(/\s+/).filter(Boolean)
    const fixed = typed.map((t) => fixes.get(t) ?? t).join(' ')
    if (fixed !== typed.join(' ')) correctedQuery = fixed
  }

  return { words, colors, minPrice, maxPrice, inStock, correctedQuery, impossible }
}

function scoreWith(p: Product, q: Plan): number {
  if (q.impossible) return 0
  if (q.maxPrice !== null && p.price > q.maxPrice) return 0
  if (q.minPrice !== null && p.price < q.minPrice) return 0
  if (q.inStock && !p.inStock) return 0

  let score = 0
  for (const family of q.colors) {
    if (!hasColor(p, family)) return 0
    score += WEIGHTS.colors
  }
  const brand = fieldsOf(p)[0]?.tokens[0]
  for (const w of q.words) {
    const m = bestWordMatch(p, w)
    if (!m) return 0
    // "часы" names the watches; phones that merely sit in "Смартфоны и часы" do not count.
    if (tierOf(m.weight) > w.bestTier + 1) return 0
    score += m.score
    // The brand or model typed first is the strongest signal.
    if (brand?.startsWith(m.spelling)) score += 1
  }
  return Math.max(score, 1)
}

/** Scores the products and drops those far weaker than the best match. */
function relevant(products: readonly Product[], q: Plan) {
  const scored = products.map((p) => ({ p, score: scoreWith(p, q) })).filter((x) => x.score > 0)
  const top = Math.max(0, ...scored.map((x) => x.score))
  const floor = top >= 3 ? Math.max(1, MIN_SHARE * top) : 0
  return scored.filter((x) => x.score >= floor)
}

/**
 * Relevance of a product for a search query: 0 means no match.
 * A blank query (or one of only constraints) matches with score 1.
 */
export function searchScore(p: Product, query: string): number {
  return scoreWith(p, plan([p], query))
}

export type SearchResult = { products: Product[]; correctedQuery: string | null }

/** Ranked search over a catalogue with a "did you mean" suggestion. */
export function searchCatalog(
  products: readonly Product[],
  query: string,
  limit = Infinity,
): SearchResult {
  if (!query.trim()) return { products: [], correctedQuery: null }
  const q = plan(products, query)
  const found = relevant(products, q)
    .sort((a, b) => b.score - a.score || b.p.popularity - a.p.popularity)
    .slice(0, limit)
    .map((x) => x.p)
  return { products: found, correctedQuery: q.correctedQuery }
}

/** Ranked quick search for the command palette. */
export function searchProducts(products: readonly Product[], query: string, limit = 6): Product[] {
  return searchCatalog(products, query, limit).products
}

/**
 * Pure filter + sort used by the mock backend; exported for unit tests. The query is matched
 * the same way as in the palette, so both agree on what was found.
 */
export function applyFilters(products: readonly Product[], f: ProductFilters): Product[] {
  const q = plan(products, f.query)
  const scores = new Map(relevant(products, q).map((x) => [x.p, x.score]))
  const list = products.filter(
    (p) =>
      (f.category === 'all' || p.category === f.category) &&
      (f.maxPrice === null || p.price <= f.maxPrice) &&
      (!f.inStockOnly || p.inStock) &&
      scores.has(p),
  )
  const relevance = (p: Product) => (f.query.trim() ? (scores.get(p) ?? 0) : 0)
  switch (f.sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price)
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price)
    default:
      // With a query, the most relevant first (as in the palette), then the most popular.
      return list.sort((a, b) => relevance(b) - relevance(a) || b.popularity - a.popularity)
  }
}

/** Same category first, then the rest; never the product itself. */
export function pickSimilar(products: readonly Product[], base: Product, limit = 4): Product[] {
  const others = products.filter((p) => p.id !== base.id)
  return [
    ...others.filter((p) => p.category === base.category),
    ...others.filter((p) => p.category !== base.category),
  ].slice(0, limit)
}
