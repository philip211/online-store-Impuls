import clsx from 'clsx'
import type { ComponentProps, ReactNode } from 'react'

import s from './field.module.css'

type OptionCardProps = Omit<ComponentProps<'input'>, 'type'> & {
  label: ReactNode
  meta?: ReactNode
}

/** Radio rendered as a selectable card. */
export function OptionCard({ label, meta, checked, className, ...rest }: OptionCardProps) {
  return (
    <label className={clsx(s.opt, checked && s.optOn, className)}>
      <input type="radio" checked={checked} {...rest} />
      <span className={s.optLabel}>{label}</span>
      {meta && <b className={s.optMeta}>{meta}</b>}
    </label>
  )
}

type OptionGroupProps = ComponentProps<'fieldset'> & { legend: string }

export function OptionGroup({ legend, className, children, ...rest }: OptionGroupProps) {
  return (
    <fieldset className={clsx(s.opts, className)} {...rest}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  )
}

export function Checkbox({
  label,
  className,
  ...rest
}: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode }) {
  return (
    <label className={clsx(s.check, className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}
