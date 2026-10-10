import clsx from 'clsx'
import { useId, type ComponentProps } from 'react'

import s from './field.module.css'

type TextAreaProps = ComponentProps<'textarea'> & {
  label: string
  error?: string
  /** Shown under the field: a limit, a hint. */
  hint?: string
}

export function TextArea({ label, error, hint, id, className, ...rest }: TextAreaProps) {
  const autoId = useId()
  const areaId = id ?? autoId
  const noteId = `${areaId}-note`

  return (
    <div className={clsx(s.field, error && s.bad, className)}>
      <label htmlFor={areaId}>{label}</label>
      <textarea
        id={areaId}
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
