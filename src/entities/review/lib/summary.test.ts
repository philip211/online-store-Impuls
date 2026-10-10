import type { Review } from '../model/types'
import { formatReviewDate, formatSummary, parseDay, sortReviews, summarize } from './summary'

const r = (id: string, rating: Review['rating'], date: string, helpful = 0): Review => ({
  id,
  author: id,
  rating,
  text: '',
  date,
  verified: true,
  helpful,
})

const LIST = [
  r('a', 5, '2026-08-01', 3),
  r('b', 3, '2026-09-20', 7),
  r('c', 4, '2026-09-25', 3),
  r('d', 5, '2026-07-10', 0),
]

describe('summarize', () => {
  it('computes the average and a 5→1 breakdown', () => {
    const s = summarize(LIST)
    expect(s.count).toBe(4)
    expect(s.average).toBeCloseTo(4.25)
    expect(s.breakdown).toEqual([
      { stars: 5, count: 2 },
      { stars: 4, count: 1 },
      { stars: 3, count: 1 },
      { stars: 2, count: 0 },
      { stars: 1, count: 0 },
    ])
  })

  it('handles an empty list', () => {
    const s = summarize([])
    expect(s.average).toBe(0)
    expect(s.breakdown.every((b) => b.count === 0)).toBe(true)
  })

  it('formats with a comma and Russian plural', () => {
    expect(formatSummary({ average: 4.25, count: 4 })).toBe('4,3 · 4 отзыва')
    expect(formatSummary({ average: 5, count: 5 })).toBe('5,0 · 5 отзывов')
  })
})

describe('sortReviews', () => {
  const ids = (list: Review[]) => list.map((x) => x.id).join('')

  it('puts the most helpful first, newest on ties', () => {
    expect(ids(sortReviews(LIST, 'helpful'))).toBe('bcad')
  })
  it('sorts by date', () => expect(ids(sortReviews(LIST, 'new'))).toBe('cbad'))
  it('puts low ratings first', () => expect(ids(sortReviews(LIST, 'low'))).toBe('bcad'))
  it('does not mutate the input', () => {
    sortReviews(LIST, 'low')
    expect(ids(LIST)).toBe('abcd')
  })
})

describe('dates', () => {
  it('parses ISO days in local time', () => {
    const d = parseDay('2026-09-12')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 12])
  })
  it('formats with the year', () =>
    expect(formatReviewDate('2026-09-12').replace(/\u00A0/g, ' ')).toBe('12 сентября 2026'))
})
