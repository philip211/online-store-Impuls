/** ISO/IEC 7810 ID-1: every bank card in the world, a size everyone knows by hand. */
export const CARD_MM = { w: 85.6, h: 54 } as const

export type Box = { x: number; y: number; w: number; h: number }

export type ScaleScene = {
  width: number
  height: number
  /** The product's front face: its two largest sides, or its diameter when round. */
  product: Box & { round: boolean }
  card: Box
  /** The third side, when the size lists one (thickness or depth). */
  depth: number | null
}

export type Dimensions = {
  /** Sides in millimetres, in the order the size lists them. */
  sides: number[]
  /** "Ø 13,3 × 4,6 см": the first number is a diameter. */
  round: boolean
}

const GAP_MM = 16
const SIDES = /(\d+(?:[.,]\d+)?)\s*×\s*(\d+(?:[.,]\d+)?)(?:\s*×\s*(\d+(?:[.,]\d+)?))?/

/**
 * Reads the first "a × b" or "a × b × c" run of a size in centimetres, ignoring prefixes
 * ("около", "кейс") and trailing notes ("(40 мм)", "в сложенном виде").
 */
export function parseDimensions(size: string): Dimensions | null {
  const match = SIDES.exec(size)
  if (!match) return null
  const sides = match
    .slice(1)
    .filter((n): n is string => n !== undefined)
    .map((n) => Math.round(Number(n.replace(',', '.')) * 100) / 10)
  if (sides.some((n) => !(n > 0))) return null
  return { sides, round: /Ø/.test(size.slice(0, match.index + 1)) }
}

/**
 * Product and card side by side on a shared baseline, in millimetres (the SVG viewBox).
 * The front face is the two largest sides; `portrait` stands it on its short edge,
 * the way a phone or a reader is held.
 */
export function scaleScene(size: string, { portrait = false } = {}): ScaleScene | null {
  const dims = parseDimensions(size)
  if (!dims) return null
  // A disc is seen from above: the diameter both ways, the second number is its height.
  const [first = 0, second = 0, third] = dims.round
    ? [dims.sides[0], dims.sides[0], dims.sides[1]]
    : [...dims.sides].sort((a, b) => b - a)
  const [w, h] = portrait && !dims.round ? [second, first] : [first, second]
  const depth = third ?? null
  const height = Math.max(h, CARD_MM.h)
  return {
    width: w + GAP_MM + CARD_MM.w,
    height,
    product: { x: 0, y: height - h, w, h, round: dims.round },
    card: { x: w + GAP_MM, y: height - CARD_MM.h, w: CARD_MM.w, h: CARD_MM.h },
    depth,
  }
}

/** Kinds that stand upright in the hand or on the wrist: drawn taller than wide. */
const PORTRAIT_KINDS = new Set([
  'Наушники',
  'Смартфон',
  'Умные часы',
  'Спортивные часы',
  'Электронная книга',
  'Планшет',
])

export const isPortraitKind = (kind: string) => PORTRAIT_KINDS.has(kind)

/** Millimetres as centimetres with a decimal comma: 85.6 → "8,6". */
export const formatCm = (mm: number) => String(Math.round(mm) / 10).replace('.', ',')
