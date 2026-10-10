export type ReviewRating = 1 | 2 | 3 | 4 | 5

export type Review = {
  id: string
  author: string
  rating: ReviewRating
  text: string
  /** Publication day, ISO "YYYY-MM-DD". */
  date: string
  /** Matched to an order number — the only reviews we publish. */
  verified: boolean
  /** "Полезно" votes; drives the default sort. */
  helpful: number
}

export type ReviewSummary = {
  average: number
  count: number
  /** Count per star, ordered 5 → 1. */
  breakdown: { stars: ReviewRating; count: number }[]
}

export type ReviewSort = 'helpful' | 'new' | 'low'
