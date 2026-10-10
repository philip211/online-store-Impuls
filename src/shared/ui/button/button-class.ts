import clsx from 'clsx'

import s from './button.module.css'

export type ButtonVariantProps = {
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'sm'
  wide?: boolean
}

/** Button styling for elements that are not <Button>, e.g. router links. */
export function buttonClass({ variant = 'primary', size = 'md', wide }: ButtonVariantProps = {}) {
  return clsx(s[variant], size === 'sm' && s.sm, wide && s.wide)
}
