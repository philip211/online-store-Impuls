import clsx from 'clsx'
import type { ComponentProps } from 'react'

import s from './badge.module.css'

type BadgeProps = ComponentProps<'span'> & {
  tone?: 'accent' | 'muted'
  /** Pin to the top-left corner of the nearest positioned parent. */
  floating?: boolean
}

export function Badge({ tone = 'accent', floating, className, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(s.badge, tone === 'muted' && s.muted, floating && s.floating, className)}
      {...rest}
    />
  )
}
