import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'

import { useSessionStatus } from '@/entities/session'
import { api, isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { Alert, Button, CheckIcon, StarIcon, text, TextArea } from '@/shared/ui'

import s from './write-review.module.css'

const TEXT_MIN = 10
const TEXT_MAX = 2000
const STARS = [1, 2, 3, 4, 5] as const
const STAR_WORDS = ['', 'Плохо', 'Так себе', 'Нормально', 'Хорошо', 'Отлично']

type Draft = { productId: number; rating: number; text: string }

const sendReview = (body: Draft) =>
  api<{ id: string; status: string }>('/reviews', { method: 'POST', body })

/**
 * Review form for buyers. Anyone may open it; the API checks the account received this
 * product and holds the review for moderation, so the copy says exactly that.
 */
type FieldError = { field: 'rating' | 'text'; message: string }

export function WriteReview({ productId }: { productId: number }) {
  const status = useSessionStatus()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<FieldError | null>(null)
  const mutation = useMutation({ mutationFn: sendReview })
  const errorId = useId()
  const ctaRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)
  const wasOpen = useRef(open)

  // The control that was pressed goes away (the button opens the form, Cancel closes it,
  // sending replaces it), so focus moves on deliberately instead of falling to the page.
  useEffect(() => {
    if (mutation.isSuccess) doneRef.current?.focus()
    else if (open && !wasOpen.current) formRef.current?.querySelector('input')?.focus()
    else if (!open && wasOpen.current) ctaRef.current?.focus()
    wasOpen.current = open
  }, [open, mutation.isSuccess])

  if (mutation.isSuccess) {
    return (
      <p className={s.done} ref={doneRef} tabIndex={-1}>
        <CheckIcon size={18} />
        Спасибо! Отзыв появится после проверки — обычно в течение дня.
      </p>
    )
  }

  if (!open) {
    return (
      <div className={s.cta}>
        {status === 'user' ? (
          <Button ref={ctaRef} variant="secondary" onClick={() => setOpen(true)}>
            Написать отзыв
          </Button>
        ) : (
          <p className={s.note}>
            Купили этот товар?{' '}
            <Link to={routes.login(pathname)} className={s.link}>
              Войдите
            </Link>
            , чтобы оставить отзыв.
          </p>
        )}
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!rating) return setError({ field: 'rating', message: 'Поставьте оценку' })
    if (body.trim().length < TEXT_MIN) {
      return setError({ field: 'text', message: 'Расскажите чуть подробнее — от 10 символов' })
    }
    setError(null)
    mutation.mutate({ productId, rating, text: body.trim() })
  }

  const apiError = mutation.isError
    ? isApiError(mutation.error) && mutation.error.status < 500
      ? mutation.error.detail
      : 'Не получилось отправить. Попробуйте ещё раз.'
    : null

  return (
    <form className={s.form} onSubmit={submit} noValidate ref={formRef}>
      <fieldset
        className={s.stars}
        aria-invalid={error?.field === 'rating' || undefined}
        aria-describedby={error?.field === 'rating' ? errorId : undefined}
      >
        <legend className={s.legend}>Оценка</legend>
        <div className={s.starRow}>
          {STARS.map((n) => (
            <label key={n} className={clsx(s.star, n <= rating && s.on)}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
              />
              <StarIcon size={28} />
              <span className={text.srOnly}>{`${n} из 5 — ${STAR_WORDS[n]}`}</span>
            </label>
          ))}
          <span className={s.word} aria-hidden="true">
            {STAR_WORDS[rating]}
          </span>
        </div>
        {error?.field === 'rating' && (
          <span id={errorId} className={s.fieldError}>
            {error.message}
          </span>
        )}
      </fieldset>
      <TextArea
        label="Что понравилось, что нет"
        rows={5}
        maxLength={TEXT_MAX}
        hint="Честные минусы помогают другим не меньше плюсов"
        error={error?.field === 'text' ? error.message : undefined}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {apiError && <Alert>{apiError}</Alert>}
      <div className={s.actions}>
        <Button type="submit" loading={mutation.isPending} disabled={mutation.isPending}>
          Отправить отзыв
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
