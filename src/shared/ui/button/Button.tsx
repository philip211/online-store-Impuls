import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { Link } from 'react-router'

import { Spinner } from '../spinner/Spinner'
import { buttonClass, type ButtonVariantProps } from './button-class'
import s from './button.module.css'

type ButtonProps = ComponentProps<'button'> & ButtonVariantProps & { loading?: boolean }

export function Button({
  variant,
  size,
  wide,
  loading,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(buttonClass({ variant, size, wide }), loading && s.busy, className)}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

type ButtonLinkProps = ComponentProps<typeof Link> & ButtonVariantProps

export function ButtonLink({ variant, size, wide, className, ...rest }: ButtonLinkProps) {
  return (
    <Link
      viewTransition
      className={clsx(buttonClass({ variant, size, wide }), className)}
      {...rest}
    />
  )
}
