import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import {
  formatAverage,
  RatingBreakdown,
  REVIEW_FORMS,
  REVIEW_SORTS,
  ReviewCard,
  ReviewGrid,
  reviewQueries,
  sortReviews,
  summarize,
  type ReviewSort,
} from '@/entities/review'
import { WriteReview } from '@/features/write-review'
import { plural } from '@/shared/lib'
import { Chip, ChipGroup, Section, SectionHeader, Skeleton, text } from '@/shared/ui'

import s from './product-reviews.module.css'

/** Reviews of the product's section; buyers of this product can add one. */
export function ProductReviews({ group, productId }: { group: string; productId: number }) {
  const { data: reviews } = useQuery(reviewQueries.byGroup(group))
  const [sort, setSort] = useState<ReviewSort>('helpful')

  const summary = useMemo(() => (reviews ? summarize(reviews) : null), [reviews])
  const sorted = useMemo(() => (reviews ? sortReviews(reviews, sort) : null), [reviews, sort])
  const sortLabel = REVIEW_SORTS.find((o) => o.id === sort)?.label

  return (
    <Section flush className={s.section} aria-labelledby="h-rev">
      <SectionHeader
        id="h-rev"
        title="Отзывы"
        lead="Отзывы оставляют только покупатели — проверяем по номеру заказа."
      />

      <div className={s.layout}>
        <aside className={s.summary} aria-label="Сводка оценок">
          {summary ? (
            summary.count > 0 ? (
              <>
                <p className={s.avg}>
                  <span className={s.avgNum}>{formatAverage(summary.average)}</span>
                  <span className={text.mono}>
                    из 5 · {summary.count} {plural(summary.count, REVIEW_FORMS)}
                  </span>
                </p>
                <RatingBreakdown summary={summary} />
              </>
            ) : (
              <p className={text.muted}>Отзывов пока нет. Первым будет тот, кто купит.</p>
            )
          ) : (
            <Skeleton style={{ height: 160, borderRadius: 'var(--radius-xl)' }} />
          )}
        </aside>

        <div className={s.list}>
          <WriteReview productId={productId} />
          {sorted && sorted.length > 1 && (
            <ChipGroup role="group" aria-label="Порядок отзывов" className={s.sort}>
              {REVIEW_SORTS.map((o) => (
                <Chip key={o.id} active={sort === o.id} onClick={() => setSort(o.id)}>
                  {o.label}
                </Chip>
              ))}
            </ChipGroup>
          )}
          {/* Announces the loaded count and each re-sort to screen readers. */}
          <p className={text.srOnly} aria-live="polite">
            {sorted ? `${sorted.length} ${plural(sorted.length, REVIEW_FORMS)}. ${sortLabel}` : ''}
          </p>
          <ReviewGrid busy={!sorted}>
            {sorted
              ? sorted.map((r) => <ReviewCard key={r.id} review={r} />)
              : [0, 1].map((i) => <Skeleton key={i} style={{ height: 120, borderRadius: 20 }} />)}
          </ReviewGrid>
        </div>
      </div>
    </Section>
  )
}
