/** Case- and ё-insensitive form for matching user input against catalogue text. */
export const normalize = (s: string) => s.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim()

type Part = { text: string; hit: boolean }

/**
 * Splits `text` into parts, flagging those that match any word of `query`
 * (for highlighting). Normalisation keeps string length, so indices line up.
 */
export function splitMatch(text: string, query: string): Part[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [{ text, hit: false }]

  const hay = text.toLocaleLowerCase('ru').replaceAll('ё', 'е')
  const marked = new Array<boolean>(text.length).fill(false)
  for (const w of words) {
    for (let i = hay.indexOf(w); i !== -1; i = hay.indexOf(w, i + w.length)) {
      marked.fill(true, i, i + w.length)
    }
  }

  const parts: Part[] = []
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1)
    if (last && last.hit === marked[i]) last.text += text[i]
    else parts.push({ text: text[i] ?? '', hit: marked[i] ?? false })
  }
  return parts
}
