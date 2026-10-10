import clsx from 'clsx'
import { useId, type ComponentProps } from 'react'

import s from './field.module.css'

type TextFieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  /** Shown under the field and read with it: a rule, a format. Replaced by the error. */
  hint?: string
}

export function TextField({ label, error, hint, id, className, ...rest }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const noteId = `${inputId}-note`

  return (
    <div className={clsx(s.field, error && s.bad, className)}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        {...rest}
      />
      {(error || hint) && (
        <span id={noteId} className={error ? s.error : s.hint}>
          {error ?? hint}
        </span>
      )}
    </div>
  )
}
