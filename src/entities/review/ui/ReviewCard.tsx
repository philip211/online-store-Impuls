import clsx from 'clsx'
import type { ReactNode } from 'react'

import { plural } from '@/shared/lib'
import { CheckIcon, StarIcon, text } from '@/shared/ui'

import { formatReviewDate, REVIEW_FORMS } from '../lib/summary'
import type { Review, ReviewSummary } from '../model/types'
import s from './review.module.css'

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className={clsx(s.rev, text.reveal)}>
      <div className={s.head}>
        <span>{review.author}</span>
        <Rating label={`${review.rating} из 5`} size={16} />
      </div>
      <p className={s.meta}>
        <time dateTime={review.date}>{formatReviewDate(review.date)}</time>
        {review.verified && (
          <span className={s.verified}>
            <CheckIcon size={14} />
            Проверенная покупка
          </span>
        )}
      </p>
      <p className={s.body}>{review.text}</p>
    </article>
  )
}

export function Rating({ label, size = 18 }: { label: string; size?: number }) {
  return (
    <span className={s.stars}>
      <StarIcon size={size} />
      {label}
    </span>
  )
}

export function ReviewGrid({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className={s.grid} aria-busy={busy || undefined}>
      {children}
    </div>
  )
}

/** Share of reviews per star, 5 → 1. Each row carries its own text, the bar is decoration. */
export function RatingBreakdown({ summary }: { summary: ReviewSummary }) {
  return (
    <ul className={s.bars}>
      {summary.breakdown.map(({ stars, count }) => {
        const share = summary.count ? count / summary.count : 0
        return (
          <li key={stars}>
            <span className={text.srOnly}>
              {`${stars} из 5 — ${count} ${plural(count, REVIEW_FORMS)}`}
            </span>
            <span className={s.barStars} aria-hidden="true">
              {stars}
              <StarIcon size={12} />
            </span>
            <span className={s.barTrack} aria-hidden="true">
              <span className={s.barFill} style={{ width: `${Math.round(share * 100)}%` }} />
            </span>
            <span className={s.barCount} aria-hidden="true">
              {count}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
