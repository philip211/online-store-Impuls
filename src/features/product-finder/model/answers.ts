/** The three questions of the finder; values are what ends up in the URL. */
export const USES = [
  { value: 'music', label: 'Музыка в дороге', hint: 'Метро, перелёты, прогулки' },
  { value: 'sport', label: 'Спорт и здоровье', hint: 'Тренировки, бег, сон' },
  { value: 'work', label: 'Работа и учёба', hint: 'Набор текста, зарядка в пути' },
  { value: 'photo', label: 'Фото и подарки', hint: 'Снимки на память, сюрприз близким' },
  { value: 'reading', label: 'Чтение', hint: 'Книги в дороге и перед сном' },
] as const

export const BUDGETS = [
  { value: '10', label: 'до 10 000 ₽', max: 10_000 },
  { value: '20', label: 'до 20 000 ₽', max: 20_000 },
  { value: '40', label: 'до 40 000 ₽', max: 40_000 },
  { value: 'any', label: 'Не важно', max: null },
] as const

export const PREFS = [
  { value: 'battery', label: 'Автономность', hint: 'Реже думать о зарядке' },
  { value: 'sound', label: 'Звук', hint: 'Чисто, громко, без шума вокруг' },
  { value: 'compact', label: 'Компактность', hint: 'Лёгкое и помещается в карман' },
  { value: 'screen', label: 'Экран и камера', hint: 'Чёткая картинка и снимки' },
] as const

export type FinderUse = (typeof USES)[number]['value']
export type FinderBudget = (typeof BUDGETS)[number]['value']
export type FinderPref = (typeof PREFS)[number]['value']

export type FinderAnswers = {
  use: FinderUse | null
  budget: FinderBudget | null
  pref: FinderPref | null
}

export type CompleteAnswers = { [K in keyof FinderAnswers]: NonNullable<FinderAnswers[K]> }

export type FinderKey = keyof FinderAnswers

/** Question order; the step number is the index + 1. */
export const STEPS = [
  { key: 'use', title: 'Для чего?', options: USES },
  { key: 'budget', title: 'Бюджет', options: BUDGETS },
  { key: 'pref', title: 'Что важнее?', options: PREFS },
] as const satisfies readonly {
  key: FinderKey
  title: string
  options: readonly { value: string; label: string }[]
}[]

export const STEP_COUNT = STEPS.length

const pick = <T extends string>(list: readonly { value: T }[], v: string | null): T | null =>
  list.find((o) => o.value === v)?.value ?? null

export function parseAnswers(params: URLSearchParams): FinderAnswers {
  return {
    use: pick(USES, params.get('use')),
    budget: pick(BUDGETS, params.get('budget')),
    pref: pick(PREFS, params.get('pref')),
  }
}

export const isComplete = (a: FinderAnswers): a is CompleteAnswers =>
  a.use !== null && a.budget !== null && a.pref !== null

/**
 * Which screen to show: 0-based question index, or 'results'.
 * An explicit ?step= wins (Back keeps later answers), but never skips an unanswered question.
 */
export function resolveStep(params: URLSearchParams): number | 'results' {
  const answers = parseAnswers(params)
  const firstMissing = STEPS.findIndex((st) => answers[st.key] === null)
  const requested = Number(params.get('step')) - 1
  const limit = firstMissing === -1 ? STEP_COUNT - 1 : firstMissing
  if (Number.isInteger(requested) && requested >= 0 && requested <= limit) return requested
  return firstMissing === -1 ? 'results' : firstMissing
}

/** Records an answer; every question but the last leads to the next one, the last to results. */
export function answer(params: URLSearchParams, key: FinderKey, value: string): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set(key, value)
  next.delete('step')
  const index = STEPS.findIndex((st) => st.key === key)
  // Changing an earlier answer still walks through the following question once more.
  if (index < STEP_COUNT - 1) next.set('step', String(index + 2))
  return next
}

/** One screen back; from the results that is the last question. */
export function stepBack(params: URLSearchParams, current: number | 'results'): URLSearchParams {
  const target = current === 'results' ? STEP_COUNT - 1 : current - 1
  const next = new URLSearchParams(params)
  if (target >= 0) next.set('step', String(target + 1))
  return next
}

export const labelOf = (key: FinderKey, value: string) =>
  STEPS.find((st) => st.key === key)?.options.find((o) => o.value === value)?.label ?? value
