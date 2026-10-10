import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { useRef, useState, type FormEvent } from 'react'

import { formatDate, formatPhone } from '@/shared/lib'
import { Button, TextField } from '@/shared/ui'

import { trackOrder } from '../api/help-api'
import { parseOrderNumber } from '../lib/order-status'
import { isPhoneComplete } from '../lib/phone'
import s from './topic.module.css'

type Errors = { order?: string; phone?: string }

export function OrderTracker() {
  const [order, setOrder] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const orderRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const mutation = useMutation({ mutationFn: trackOrder })
  const status = mutation.data

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found: Errors = {}
    if (!parseOrderNumber(order)) found.order = 'Номер выглядит так: IM-123456'
    if (!isPhoneComplete(phone)) found.phone = 'Нужен телефон, указанный в заказе'
    setErrors(found)
    // Focusing the first invalid field reads its label, state and linked error aloud.
    if (found.order) orderRef.current?.focus()
    else if (found.phone) phoneRef.current?.focus()
    else mutation.mutate({ order, phone })
  }

  return (
    <section className={s.flow} aria-labelledby="track-title">
      <form className={s.flowBody} onSubmit={submit} noValidate>
        <h2 id="track-title" className={s.h2}>
          Где мой заказ
        </h2>
        <div className={s.fieldsTwo}>
          <TextField
            ref={orderRef}
            label="Номер заказа"
            placeholder="IM-123456"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={order}
            error={errors.order}
            onChange={(e) => setOrder(e.target.value)}
          />
          <TextField
            ref={phoneRef}
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 900 000-00-00"
            value={phone}
            error={errors.phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </div>
        <p className={s.hint}>Номер есть в СМС и письме о заказе.</p>
        <div className={s.actions}>
          <Button type="submit" loading={mutation.isPending} disabled={mutation.isPending}>
            Проверить статус
          </Button>
        </div>
      </form>

      <div aria-live="polite" aria-busy={mutation.isPending || undefined}>
        {mutation.isError && (
          <p className={s.error}>Не нашли заказ с таким номером и телефоном. Проверьте данные.</p>
        )}
        {status && (
          <div className={s.status}>
            <p className={s.statusHead}>
              Заказ <b data-numeric>{status.number}</b> ·{' '}
              {status.method === 'courier' ? 'курьером' : 'в пункт выдачи'} · сейчас:{' '}
              {status.steps[status.current]?.label.toLocaleLowerCase('ru')}
            </p>
            <ol className={s.timeline}>
              {status.steps.map((step, i) => (
                <li
                  key={step.label}
                  className={clsx(step.done && s.done)}
                  aria-current={i === status.current ? 'step' : undefined}
                >
                  <span className={s.dot} aria-hidden="true" />
                  <div>
                    <p className={s.stepLabel}>{step.label}</p>
                    <p className={s.stepMeta}>
                      {step.done ? formatDate(step.date) : `Ожидается ${formatDate(step.date)}`}
                      {' · '}
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  )
}
