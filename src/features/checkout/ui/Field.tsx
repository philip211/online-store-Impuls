import clsx from 'clsx'
import { useId, type ComponentProps, type ReactNode } from 'react'

import { CheckIcon } from '@/shared/ui'

import s from './checkout.module.css'

type FieldProps = ComponentProps<'input'> & {
  label: string
  /** Why we ask or what to type; stays visible next to an error. */
  hint?: ReactNode
  error?: string
  /** Touched and valid: shows a quiet check instead of nothing. */
  valid?: boolean
  optional?: boolean
}

/** Checkout text field: label, hint, adaptive error and a success mark. */
export function Field({ label, hint, error, valid, optional, id, className, ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = clsx(error && errorId, hint && hintId) || undefined

  return (
    <div className={clsx(s.field, error && s.bad, valid && !error && s.ok, className)}>
      <label htmlFor={inputId}>
        {label}
        {optional && <span className={s.optional}> — необязательно</span>}
      </label>
      <div className={s.control}>
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {valid && !error && <CheckIcon className={s.mark} size={18} strokeWidth={2} />}
      </div>
      {error && (
        <span id={errorId} className={s.error}>
          {error}
        </span>
      )}
      {hint && (
        <span id={hintId} className={s.hint}>
          {hint}
        </span>
      )}
    </div>
  )
}
