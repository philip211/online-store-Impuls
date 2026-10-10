export const phoneDigits = (value: string) => value.replace(/\D/g, '')

/** Progressive mask: "79001234567" → "+7 900 123-45-67". A leading 8 is treated as 7. */
export function formatPhone(value: string): string {
  let d = phoneDigits(value).slice(0, 11)
  if (!d) return ''
  if (d[0] === '8') d = `7${d.slice(1)}`
  if (d[0] !== '7') d = `7${d}`.slice(0, 11)

  let out = `+${d[0]}`
  if (d.length > 1) out += ` ${d.slice(1, 4)}`
  if (d.length > 4) out += ` ${d.slice(4, 7)}`
  if (d.length > 7) out += `-${d.slice(7, 9)}`
  if (d.length > 9) out += `-${d.slice(9, 11)}`
  return out
}
