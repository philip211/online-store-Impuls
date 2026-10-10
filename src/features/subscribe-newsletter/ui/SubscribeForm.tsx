import clsx from 'clsx'
import { useId, useState, type FormEvent } from 'react'

import { ArrowRightIcon, CheckIcon, Spinner } from '@/shared/ui'

import { useSubscribe, useSubscribedStore, validateEmail } from '../model/subscribe'
import s from './subscribe.module.css'

export function SubscribeForm() {
  const id = useId()
  const subscribed = useSubscribedStore((st) => st.email)
  const mutation = useSubscribe()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (subscribed) {
    return (
      <p className={s.done} role="status">
        <span className={s.doneIcon}>
          <CheckIcon size={18} />
        </span>
        Готово! Первое письмо придёт на <b>{subscribed}</b>
      </p>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const check = validateEmail(value)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setError(null)
    mutation.mutate(check.email)
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <label htmlFor={id} className={s.srOnly}>
        Электронная почта
      </label>
      <div className={clsx(s.field, error && s.bad)}>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.ru"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button type="submit" disabled={mutation.isPending} aria-label="Подписаться">
          {mutation.isPending ? <Spinner /> : <ArrowRightIcon size={20} />}
        </button>
      </div>
      {error && (
        <span id={`${id}-err`} className={s.error} role="alert">
          {error}
        </span>
      )}
      <span className={s.note}>Раз в неделю: скидки и новинки. Отписаться — в один клик.</span>
    </form>
  )
}
