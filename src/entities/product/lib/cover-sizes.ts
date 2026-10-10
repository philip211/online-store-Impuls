/** "4 / 5" → 0.8. Undefined for a missing or malformed ratio. */
export function parseRatio(ratio: string | undefined): number | undefined {
  if (!ratio) return undefined
  const [w, h = '1'] = ratio.split('/').map((part) => part.trim())
  const value = Number(w) / Number(h)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** Splits on commas that are not inside parentheses, e.g. inside min() or calc(). */
function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i))
      start = i + 1
    }
  }
  parts.push(value.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

/** Splits one `sizes` slot into its media condition (may be empty) and its length. */
function splitSlot(slot: string): [condition: string, length: string] {
  let depth = 0
  let cut = -1
  for (let i = 0; i < slot.length; i++) {
    const ch = slot[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (/\s/.test(ch ?? '') && depth === 0) cut = i
  }
  return cut < 0 ? ['', slot] : [slot.slice(0, cut).trim(), slot.slice(cut + 1).trim()]
}

/**
 * Rewrites a frame's `sizes` for a photo cropped with object-fit: cover. A photo wider than its
 * frame is drawn at frame height, so its rendered width is the frame width times
 * (photo aspect / frame aspect). Fixed px lengths are multiplied out, others wrapped in calc().
 * A photo as narrow as the frame or narrower fills the width, so `sizes` is returned unchanged.
 */
export function coverSizes(sizes: string, photoAspect: number, frameAspect: number): string {
  const k = Math.round((photoAspect / frameAspect) * 100) / 100
  if (!(k > 1)) return sizes
  return splitTopLevel(sizes)
    .map((slot) => {
      const [condition, length] = splitSlot(slot)
      const px = /^(\d+(?:\.\d+)?)px$/.exec(length)
      const scaled = px ? `${Math.ceil(Number(px[1]) * k)}px` : `calc(${length} * ${k})`
      return condition ? `${condition} ${scaled}` : scaled
    })
    .join(', ')
}
