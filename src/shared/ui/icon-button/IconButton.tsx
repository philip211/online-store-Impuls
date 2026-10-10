import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { Link } from 'react-router'

import s from './icon-button.module.css'

type IconButtonProps = ComponentProps<'button'> & { label: string }

export function IconButton({ label, className, type = 'button', ...rest }: IconButtonProps) {
  return <button type={type} aria-label={label} className={clsx(s.root, className)} {...rest} />
}

type IconLinkProps = ComponentProps<typeof Link> & { label: string }

export function IconLink({ label, className, ...rest }: IconLinkProps) {
  return <Link viewTransition aria-label={label} className={clsx(s.root, className)} {...rest} />
}
