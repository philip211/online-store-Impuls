import clsx from 'clsx'
import { useId, type ComponentProps } from 'react'

import { ChevronLeftIcon } from '../icons/icons'
import s from './field.module.css'

type SelectProps = ComponentProps<'select'> & {
  label: string
  /** Visually hidden label for compact toolbars; still announced. */
  hideLabel?: boolean
  error?: string
}

/** Native select in the field style: system pickers stay accessible on every platform. */
export function Select({ label, hideLabel, error, id, className, children, ...rest }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = `${selectId}-error`

  return (
    <div className={clsx(s.field, error && s.bad, className)}>
      <label htmlFor={selectId} className={clsx(hideLabel && s.hidden)}>
        {label}
      </label>
      <span className={s.selectWrap}>
        <select
          id={selectId}
          className={s.select}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...rest}
        >
          {children}
        </select>
        <ChevronLeftIcon size={16} className={s.chevron} />
      </span>
      {error && (
        <span id={errorId} className={s.error}>
          {error}
        </span>
      )}
    </div>
  )
}
