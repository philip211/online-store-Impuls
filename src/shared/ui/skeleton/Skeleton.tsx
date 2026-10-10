import clsx from 'clsx'
import type { CSSProperties } from 'react'

import s from './skeleton.module.css'

type SkeletonProps = {
  variant?: 'line' | 'short' | 'tile'
  className?: string
  style?: CSSProperties
}

export function Skeleton({ variant = 'line', className, style }: SkeletonProps) {
  return <div className={clsx(s.sk, s[variant], className)} style={style} aria-hidden="true" />
}
