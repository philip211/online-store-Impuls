import { formatDate, plural } from '@/shared/lib'

import type { Review, ReviewRating, ReviewSort, ReviewSummary } from '../model/types'

const STARS: readonly ReviewRating[] = [5, 4, 3, 2, 1]

export const REVIEW_FORMS = ['отзыв', 'отзыва', 'отзывов'] as const

export function summarize(reviews: readonly Review[]): ReviewSummary {
  const count = reviews.length
  const average = count ? reviews.reduce((t, r) => t + r.rating, 0) / count : 0
  const breakdown = STARS.map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }))
  return { average, count, breakdown }
}

/** "4,5" */
export const formatAverage = (average: number) => average.toFixed(1).replace('.', ',')

/** "4,5 · 2 отзыва" */
export function formatSummary({ average, count }: Pick<ReviewSummary, 'average' | 'count'>) {
  return `${formatAverage(average)} · ${count} ${plural(count, REVIEW_FORMS)}`
}

export const REVIEW_SORTS: readonly { id: ReviewSort; label: string }[] = [
  { id: 'helpful', label: 'Сначала полезные' },
  { id: 'new', label: 'Сначала новые' },
  { id: 'low', label: 'С низкой оценкой' },
]

// ISO dates compare correctly as strings.
const byDateDesc = (a: Review, b: Review) => b.date.localeCompare(a.date)

/** Returns a new array; ties fall back to the newest first. */
export function sortReviews(reviews: readonly Review[], sort: ReviewSort): Review[] {
  const list = [...reviews]
  switch (sort) {
    case 'helpful':
      return list.sort((a, b) => b.helpful - a.helpful || byDateDesc(a, b))
    case 'new':
      return list.sort(byDateDesc)
    case 'low':
      return list.sort((a, b) => a.rating - b.rating || byDateDesc(a, b))
  }
}

/** Parses "2026-09-12" as a local day (Date parses ISO dates as UTC midnight). */
export function parseDay(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "12 сентября 2026" */
export function formatReviewDate(iso: string): string {
  const day = parseDay(iso)
  return `${formatDate(day)} ${day.getFullYear()}`
}
