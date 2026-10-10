import clsx from 'clsx'
import type { ComponentProps } from 'react'

import s from './alert.module.css'

type AlertProps = ComponentProps<'p'> & {
  /** `error` (default) for failures, `success` for confirmations. */
  tone?: 'error' | 'success'
}

/**
 * Inline message under a form or a list. Errors are announced at once (role="alert"),
 * confirmations politely.
 */
export function Alert({ tone = 'error', className, ...rest }: AlertProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(s.alert, s[tone], className)}
      {...rest}
    />
  )
}
