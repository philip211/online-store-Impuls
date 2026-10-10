/*
 * Error-tolerant text matching shared by product search and help-topic search.
 * Pure and dependency-free so the same rules run in the mock backend, the
 * catalogue filters and the palette.
 */

/** Lowercase, ё→е, punctuation to spaces, collapsed whitespace. */
export const normalizeText = (s: string) =>
  s
    .toLocaleLowerCase('ru')
    .replaceAll('ё', 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const tokenize = (s: string): string[] => normalizeText(s).split(' ').filter(Boolean)

// Same physical keys on QWERTY and ЙЦУКЕН (lowercase only; input is lowercased first).
const LATIN_KEYS = "`qwertyuiop[]asdfghjkl;'zxcvbnm,."
const CYRILLIC_KEYS = 'ёйцукенгшщзхъфывапролджэячсмитьбю'
const TO_CYRILLIC = new Map([...LATIN_KEYS].map((ch, i) => [ch, CYRILLIC_KEYS[i] ?? ch]))
const TO_LATIN = new Map([...CYRILLIC_KEYS].map((ch, i) => [ch, LATIN_KEYS[i] ?? ch]))

const hasCyrillic = (s: string) => /[а-яё]/.test(s)

/**
 * Re-types a word as if the keyboard layout had been right: "ыщтн" → "sony",
 * "yfeiybrb" → "наушники". Direction follows the script of the input.
 */
export function swapLayout(s: string): string {
  const lower = s.toLocaleLowerCase('ru')
  const map = hasCyrillic(lower) ? TO_LATIN : TO_CYRILLIC
  return [...lower].map((ch) => map.get(ch) ?? ch).join('')
}

// prettier-ignore
const CYR_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// Longest sequences first so "sh" wins over "s" + "h".
// prettier-ignore
const LAT_TO_CYR: [string, string][] = [
  ['shch', 'щ'], ['sch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['ts', 'ц'], ['ch', 'ч'],
  ['sh', 'ш'], ['yu', 'ю'], ['ya', 'я'], ['yo', 'е'], ['ee', 'и'], ['oo', 'у'],
  ['a', 'а'], ['b', 'б'], ['c', 'к'], ['d', 'д'], ['e', 'е'], ['f', 'ф'], ['g', 'г'],
  ['h', 'х'], ['i', 'и'], ['j', 'дж'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'],
  ['o', 'о'], ['p', 'п'], ['q', 'к'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'],
  ['v', 'в'], ['w', 'в'], ['x', 'кс'], ['y', 'и'], ['z', 'з'],
]

/**
 * Rough phonetic transliteration in the direction opposite to the input's
 * script, enough for brand words: "маршалл" → "marshall", "naushniki" → "наушники".
 */
export function translit(s: string): string {
  const lower = s.toLocaleLowerCase('ru')
  if (hasCyrillic(lower)) {
    return lower.replaceAll('дж', 'j').replace(/[а-яё]/g, (ch) => CYR_TO_LAT[ch] ?? ch)
  }
  let out = ''
  for (let i = 0; i < lower.length;) {
    const hit = LAT_TO_CYR.find(([lat]) => lower.startsWith(lat, i))
    if (hit) {
      out += hit[1]
      i += hit[0].length
    } else {
      out += lower[i]
      i += 1
    }
  }
  return out
}

/**
 * Optimal-string-alignment Damerau–Levenshtein distance: insertions, deletions,
 * substitutions and adjacent transpositions. Stops early once every path
 * exceeds `max` and then returns `max + 1`.
 */
export function damerauLevenshtein(a: string, b: string, max = Infinity): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1
  if (!a.length || !b.length) return Math.max(a.length, b.length)

  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, (prev2[j - 2] ?? 0) + 1)
      }
      row.push(d)
      rowMin = Math.min(rowMin, d)
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = row
  }
  return prev[b.length] ?? max + 1
}

/**
 * Typo budget by word length: short words must be exact (too many neighbours),
 * long words can absorb two slips. Numbers and model codes are never fuzzed.
 */
export function maxEdits(word: string): number {
  if (/\d/.test(word) || word.length < 4) return 0
  return word.length < 8 ? 1 : 2
}

export type MatchKind = 'exact' | 'prefix' | 'infix' | 'fuzzy'
export type WordMatch = { token: string; quality: number; kind: MatchKind }

/**
 * How well a query word matches one catalogue token, 0..1.
 * `partial` marks the word still being typed, so any prefix counts.
 */
export function matchToken(word: string, token: string, partial = false): WordMatch | null {
  if (word === token) return { token, quality: 1, kind: 'exact' }
  if (token.startsWith(word) && (partial || word.length >= 3)) {
    return { token, quality: 0.85, kind: 'prefix' }
  }
  if (word.length >= 3 && token.includes(word)) return { token, quality: 0.6, kind: 'infix' }

  const budget = maxEdits(word)
  if (!budget) return null
  const d = damerauLevenshtein(word, token, budget)
  if (d <= budget) return { token, quality: 0.75 - 0.1 * d, kind: 'fuzzy' }
  // A slip inside a word that is still being typed: "нашуни" → "наушники".
  if (partial && word.length >= 5 && token.length > word.length) {
    if (damerauLevenshtein(word, token.slice(0, word.length), 1) <= 1) {
      return { token, quality: 0.5, kind: 'fuzzy' }
    }
  }
  return null
}

/** Best match among tokens; ties go to the shorter (more basic) token. */
export function bestMatch(
  word: string,
  tokens: Iterable<string>,
  partial = false,
): WordMatch | null {
  let best: WordMatch | null = null
  for (const token of tokens) {
    const m = matchToken(word, token, partial)
    if (!m) continue
    if (
      !best ||
      m.quality > best.quality ||
      (m.quality === best.quality && m.token.length < best.token.length)
    ) {
      best = m
      if (m.kind === 'exact') break
    }
  }
  return best
}

/** Small words that carry no meaning on their own ("для бега" is about "бега"). */
// prettier-ignore
export const STOP_WORDS = new Set([
  'а', 'в', 'во', 'и', 'или', 'к', 'ко', 'с', 'со', 'на', 'по', 'под', 'для', 'за', 'из', 'о',
  'об', 'от', 'до', 'у', 'не', 'мне', 'мой', 'моя', 'мое', 'мои', 'мою', 'как', 'где', 'что',
  'это', 'есть', 'ли', 'бы', 'же', 'the', 'for', 'a',
])

export type QueryWord = {
  /** As typed (lowercased), used to rebuild a corrected query. */
  raw: string
  /** Normalised as typed; empty when the word was only layout punctuation (",tu"). */
  typed: string
  /** Normalised spellings to try: as typed, look-alike, with the layout fixed, transliterated. */
  variants: string[]
  /**
   * Variants that read the same as what was typed (the word itself and its Latin look-alike,
   * "х100" → "x100"): they rank without a penalty and never trigger "did you mean".
   */
  same: string[]
  /** The last word may be unfinished, so prefixes count for it. */
  partial: boolean
}

// Cyrillic letters drawn like Latin ones: on a Russian layout "x100" comes out as "х100".
// prettier-ignore
const LOOKALIKE: Record<string, string> = {
  а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
}

/**
 * Model codes mix digits or Latin letters with look-alike Cyrillic ones ("х100", "мx"):
 * read those letters as the Latin ones they look like. Empty for ordinary words.
 */
export function lookalike(word: string): string {
  if (!/[а-яё]/.test(word) || !(/\d/.test(word) || /[a-z]/.test(word))) return ''
  return word.replace(/[авекмнорстух]/g, (ch) => LOOKALIKE[ch] ?? ch)
}

/** Transliteration that reads "х" and "кс" as "x", as in model names: "мх" → "mx". */
function translitX(word: string): string {
  if (!/х|кс/.test(word)) return ''
  return translit(word.replaceAll('кс', 'x').replaceAll('х', 'x'))
}

/**
 * Splits free text into words with their spelling variants. Layout repair runs
 * on the raw word because ",.;[]'" are letters on the other layout.
 */
export function queryWords(text: string): QueryWord[] {
  const out: QueryWord[] = []
  for (const raw of text.toLocaleLowerCase('ru').split(/\s+/).filter(Boolean)) {
    const plain = tokenize(raw)
    const swapped = tokenize(swapLayout(raw))
    if (plain.length > 1) {
      // "wh-1000xm5" → "wh", "1000xm5": treat as separate words.
      for (const p of plain) {
        const same = unique([p, lookalike(p)])
        out.push({
          raw: p,
          typed: p,
          variants: unique([...same, translit(p), translitX(p)]),
          same,
          partial: false,
        })
      }
      continue
    }
    const typed = plain[0] ?? ''
    // Layout repair only when every key became a letter or digit: in "х100" the "х" key is
    // "[" on the other layout, and dropping it would search for "100" alone.
    const swappedRaw = normalizeText(swapLayout(raw))
    const swappedOk = swapped.length === 1 && swapped[0] === swappedRaw
    const same = unique([typed, lookalike(typed)])
    const variants = unique([
      ...same,
      swappedOk ? (swapped[0] ?? '') : '',
      translit(typed),
      translitX(typed),
    ])
    if (variants.length) out.push({ raw, typed, variants, same, partial: false })
  }
  const last = out.at(-1)
  // Trailing space means the user finished the word.
  if (last && !/\s$/.test(text)) last.partial = true
  return out
}

function unique(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))]
}

/** Every word is a stop word: keep them, otherwise nothing would be searched. */
export const meaningfulWords = (words: QueryWord[]) => {
  const kept = words.filter((w) => !STOP_WORDS.has(w.typed))
  return kept.length ? kept : words
}
