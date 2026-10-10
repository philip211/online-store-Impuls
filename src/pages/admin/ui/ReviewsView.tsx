import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

import { formatDateTime } from '@/entities/order'
import { pluralize, toast } from '@/shared/lib'
import { Button, CheckIcon, Chip, ChipGroup, StarIcon } from '@/shared/ui'

import { adminApi, adminQueries, type AdminReview, type ReviewStatus } from '../api/admin-api'
import { REVIEW_STATUS_LABELS } from '../model/labels'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager } from './parts'

const REVIEW_FORMS = ['отзыв', 'отзыва', 'отзывов'] as const
const STATUSES = Object.keys(REVIEW_STATUS_LABELS) as ReviewStatus[]
const isStatus = (v: string): v is ReviewStatus => v in REVIEW_STATUS_LABELS

function ReviewActions({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (status: 'PUBLISHED' | 'REJECTED') => adminApi.moderateReview(review.id, status),
    onSuccess: (_, status) => {
      toast(status === 'PUBLISHED' ? 'Отзыв опубликован' : 'Отзыв скрыт')
      // The review leaves this list: keep keyboard focus on the list instead of the page body.
      document.getElementById('reviews-title')?.focus()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      void queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
  })

  return (
    <div className={s.actions}>
      {review.status !== 'PUBLISHED' && (
        <Button
          size="sm"
          loading={mutation.isPending && mutation.variables === 'PUBLISHED'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('PUBLISHED')}
        >
          Опубликовать
        </Button>
      )}
      {review.status !== 'REJECTED' && (
        <Button
          size="sm"
          variant="secondary"
          loading={mutation.isPending && mutation.variables === 'REJECTED'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('REJECTED')}
        >
          {review.status === 'PUBLISHED' ? 'Снять с публикации' : 'Отклонить'}
        </Button>
      )}
    </div>
  )
}

export function ReviewsView() {
  const { get, page, set } = useListParams()
  const raw = get('status')
  // Moderation is the job, so the queue opens first.
  const status: ReviewStatus = isStatus(raw) ? raw : 'PENDING'
  const { data, isError, isPlaceholderData } = useQuery(
    adminQueries.reviews({ page, limit: 20, status }),
  )

  return (
    <section aria-labelledby="reviews-title">
      <title>Отзывы — управление Импульсом</title>
      <h2 id="reviews-title" className={clsx(s.h2, s.chips)} tabIndex={-1}>
        Отзывы
      </h2>
      <ChipGroup role="group" aria-label="Статус отзывов" className={s.chips}>
        {STATUSES.map((st) => (
          <Chip key={st} active={status === st} onClick={() => set({ status: st })}>
            {REVIEW_STATUS_LABELS[st]}
          </Chip>
        ))}
      </ChipGroup>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton rows={3} />}
      {data?.items.length === 0 && (
        <p className={s.empty}>
          {status === 'PENDING' ? 'Очередь пуста — все отзывы разобраны.' : 'Здесь пока пусто.'}
        </p>
      )}

      {data && data.items.length > 0 && (
        <ul className={clsx(s.reviews, isPlaceholderData && s.busy)}>
          {data.items.map((r) => (
            <li key={r.id}>
              <div>
                <p className={s.reviewHead}>
                  <span className={s.cellMain}>{r.productName}</span>
                  <span className={s.stars}>
                    <StarIcon size={14} />
                    {r.rating} из 5
                  </span>
                </p>
                <p className={s.cellMeta}>
                  {r.author} · {formatDateTime(r.createdAt)}
                  {r.verified && (
                    <>
                      {' · '}
                      <CheckIcon size={14} /> покупка подтверждена
                    </>
                  )}
                </p>
                <p className={s.reviewText}>{r.text}</p>
              </div>
              <ReviewActions review={r} />
            </li>
          ))}
        </ul>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, REVIEW_FORMS)} />
    </section>
  )
}
