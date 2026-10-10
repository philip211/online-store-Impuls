/**
 * Delivery date estimates. Baymard: 48% of sites show a speed ("1–2 days")
 * instead of a date; Narvar: 73% of shoppers say the date affects the decision.
 */

export type DeliveryMethod = 'courier' | 'pickup'

/** Business days to add, by method: [earliest, latest]. Orders after the cutoff ship a day later. */
const WINDOW: Record<DeliveryMethod, [number, number]> = {
  courier: [1, 2],
  pickup: [2, 3],
}
const CUTOFF_HOUR = 16

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу']

/** No-break space: "9 октября" never splits between the day and the month. */
const NBSP = '\u00A0'
/** Word joiner: forbids the line break browsers otherwise allow after an en dash. */
const WJ = '\u2060'

const addDays = (d: Date, n: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export function estimateDelivery(
  method: DeliveryMethod,
  now = new Date(),
): { from: Date; to: Date } {
  const [min, max] = WINDOW[method]
  const shift = now.getHours() >= CUTOFF_HOUR ? 1 : 0
  return { from: addDays(now, min + shift), to: addDays(now, max + shift) }
}

/** "завтра", "в четверг", or "12 октября" for further dates. */
export function formatDay(date: Date, now = new Date()): string {
  if (sameDay(date, addDays(now, 1))) return 'завтра'
  if (sameDay(date, addDays(now, 2))) return 'послезавтра'
  const diff = Math.round((date.getTime() - now.getTime()) / 86_400_000)
  if (diff < 7) return `в ${WEEKDAYS[date.getDay()]}`
  return formatDate(date)
}

/** "9 октября", with a no-break space. */
export const formatDate = (date: Date) => `${date.getDate()}${NBSP}${MONTHS[date.getMonth()]}`

/**
 * "9–10 октября" or "31 октября – 1 ноября". The short range never breaks; the long one
 * may wrap only after its dash, so neither date splits and no line starts with "–".
 */
export function formatDateRange(from: Date, to: Date): string {
  if (sameDay(from, to)) return formatDate(from)
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}${WJ}–${WJ}${formatDate(to)}`
  }
  return `${formatDate(from)}${NBSP}– ${formatDate(to)}`
}

/** Human sentence: "Привезём завтра, 9 октября" / "Привезём 9–10 октября". */
export function describeDelivery(method: DeliveryMethod, now = new Date()): string {
  const { from, to } = estimateDelivery(method, now)
  const verb = method === 'pickup' ? 'В пункте выдачи' : 'Привезём'
  if (sameDay(from, addDays(now, 1)) && !sameDay(from, to)) {
    return `${verb} завтра или ${formatDay(to, now)}, ${formatDateRange(from, to)}`
  }
  return `${verb} ${formatDateRange(from, to)}`
}
