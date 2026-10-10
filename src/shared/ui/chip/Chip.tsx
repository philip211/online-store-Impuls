import clsx from 'clsx'
import type { ComponentProps } from 'react'

import s from './chip.module.css'

type ChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & { active?: boolean }

export function Chip({ active = false, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={clsx(s.chip, active && s.on, className)}
      {...rest}
    />
  )
}

export function ChipGroup({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={clsx(s.group, className)} {...rest} />
}
