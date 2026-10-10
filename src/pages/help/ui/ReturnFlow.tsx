import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { isApiError } from '@/shared/api'
import { RETURN_DAYS } from '@/shared/config'
import { formatPhone } from '@/shared/lib'
import { Button, CheckIcon, OptionCard, OptionGroup, TextField } from '@/shared/ui'

import { requestReturn } from '../api/help-api'
import { parseOrderNumber } from '../lib/order-status'
import {
  RETURN_REASONS,
  reasonLabel,
  validateReturn,
  type ReturnDraft,
  type ReturnErrors,
} from '../lib/return-request'
import s from './topic.module.css'

type Step = 'form' | 'review' | 'done'

const EMPTY: ReturnDraft = { order: '', phone: '', reason: 'none' }

/**
 * Withdrawal in two steps plus a confirmation, modelled on the EU "withdrawal
 * button": as easy to leave as it was to buy. The API checks the order and the window.
 */
export function ReturnFlow() {
  const [step, setStep] = useState<Step>('form')
  const [draft, setDraft] = useState<ReturnDraft>(EMPTY)
  const [errors, setErrors] = useState<ReturnErrors>({})
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prevStep = useRef<Step>(step)

  const mutation = useMutation({ mutationFn: requestReturn, onSuccess: () => setStep('done') })

  // Move focus to the new step's heading so keyboard and screen-reader users follow along.
  // Comparing with the previous step (not a first-render flag) survives StrictMode's double
  // mount, so a fresh load never steals focus or scrolls.
  useEffect(() => {
    if (prevStep.current === step) return
    prevStep.current = step
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.closest('section')?.scrollIntoView({ block: 'nearest' })
  }, [step])

  const next = (e: FormEvent) => {
    e.preventDefault()
    const found = validateReturn(draft)
    setErrors(found)
    if (Object.keys(found).length) return
    setDraft((d) => ({ ...d, order: parseOrderNumber(d.order) ?? d.order }))
    setStep('review')
  }

  const restart = () => {
    mutation.reset()
    setDraft(EMPTY)
    setStep('form')
  }

  return (
    <section className={s.flow} aria-labelledby="return-flow">
      {step === 'form' && (
        <form className={s.flowBody} onSubmit={next} noValidate>
          <p className={s.stepNo}>Шаг 1 из 2</p>
          <h2 id="return-flow" ref={headingRef} tabIndex={-1} className={s.h2}>
            Вернуть товар
          </h2>
          <TextField
            label="Номер заказа"
            placeholder="IM-123456"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={draft.order}
            error={errors.order}
            onChange={(e) => setDraft((d) => ({ ...d, order: e.target.value }))}
          />
          <TextField
            label="Телефон из заказа"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 900 000-00-00"
            value={draft.phone}
            error={errors.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhone(e.target.value) }))}
          />
          <OptionGroup legend="Причина — по желанию, на решение не влияет" className={s.reasons}>
            {RETURN_REASONS.map((r) => (
              <OptionCard
                key={r.id}
                name="return-reason"
                label={r.label}
                value={r.id}
                checked={draft.reason === r.id}
                onChange={() => setDraft((d) => ({ ...d, reason: r.id }))}
              />
            ))}
          </OptionGroup>
          <div className={s.actions}>
            <Button type="submit">Продолжить</Button>
          </div>
        </form>
      )}

      {step === 'review' && (
        <div className={s.flowBody}>
          <p className={s.stepNo}>Шаг 2 из 2</p>
          <h2 id="return-flow" ref={headingRef} tabIndex={-1} className={s.h2}>
            Проверьте заявку
          </h2>
          <dl className={s.facts}>
            <div>
              <dt>Заказ</dt>
              <dd data-numeric>{draft.order}</dd>
            </div>
            <div>
              <dt>Причина</dt>
              <dd>{reasonLabel(draft.reason)}</dd>
            </div>
            <div>
              <dt>Как передать</dt>
              <dd>Курьер заберёт бесплатно или отнесите в пункт выдачи — выберите при звонке</dd>
            </div>
            <div>
              <dt>Возврат денег</dt>
              <dd>Тем же способом, что и оплата, в течение 10 дней</dd>
            </div>
          </dl>
          {mutation.isError && (
            <p className={s.error} role="alert">
              {isApiError(mutation.error)
                ? mutation.error.detail
                : 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.'}
            </p>
          )}
          <div className={s.actions}>
            <Button
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(draft)}
            >
              Подтвердить возврат
            </Button>
            <Button variant="secondary" onClick={() => setStep('form')}>
              Изменить
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && mutation.data && (
        <div className={s.flowBody}>
          <span className={s.doneTick}>
            <CheckIcon size={22} />
          </span>
          <h2 id="return-flow" ref={headingRef} tabIndex={-1} className={s.h2}>
            Заявка принята!
          </h2>
          <p className={s.p}>
            Номер заявки — <b data-numeric>{mutation.data.ref}</b>. Сохраните его: он пригодится
            курьеру или в пункте выдачи.
          </p>
          <ol className={s.steps}>
            <li>В течение часа позвоним и договоримся, когда забрать товар.</li>
            <li>Упакуйте товар со всеми комплектующими.</li>
            <li>Деньги вернём после проверки — обычно за 1–2 дня.</li>
          </ol>
          <p className={s.note}>
            Передумали? Просто скажите об этом при звонке — заявка отменится. Срок {RETURN_DAYS}{' '}
            дней от этого не сгорает.
          </p>
          <div className={s.actions}>
            <Button variant="secondary" onClick={restart}>
              Вернуть другой заказ
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
