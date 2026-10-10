export const phoneDigits = (value: string) => value.replace(/\D/g, '')

/** "+7 (900) 123-45-67", "8 900 1234567" → "79001234567"; anything else → null. */
export function normalizePhone(value: string): string | null {
  let d = phoneDigits(value)
  if (d.length !== 11) return null
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  return d.startsWith('7') ? d : null
}

/** "79001234567" → "+7 900 123-45-67". */
export function formatPhone(digits: string): string {
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
}
