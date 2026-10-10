import clsx from 'clsx'
import type { ComponentProps, ElementType, ReactNode } from 'react'

import s from './layout.module.css'

type ContainerProps<T extends ElementType> = {
  as?: T
  /** Index-page container: adds the shared top offset (--page-top). */
  page?: boolean
} & Omit<ComponentProps<T>, 'as' | 'page'>

export function Container<T extends ElementType = 'div'>({
  as,
  page,
  className,
  ...rest
}: ContainerProps<T>) {
  const Tag: ElementType = as ?? 'div'
  return <Tag className={clsx(s.wrap, page && s.page, className)} {...rest} />
}

type SectionProps = ComponentProps<'section'> & { flush?: boolean }

/** Page section with the design's vertical rhythm. `flush` drops the top padding. */
export function Section({ flush, className, ...rest }: SectionProps) {
  return <section className={clsx(s.wrap, s.sec, flush && s.flush, className)} {...rest} />
}

type SectionHeaderProps = {
  id?: string
  title: string
  /** Small mono label above the title, e.g. "01 — Категории". */
  eyebrow?: string
  /** One-line supporting copy under the title. */
  lead?: ReactNode
  aside?: ReactNode
}

export function SectionHeader({ id, title, eyebrow, lead, aside }: SectionHeaderProps) {
  return (
    <div className={s.head}>
      <div className={s.headMain}>
        {eyebrow && (
          <p className={s.eyebrow}>
            <i aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h2 id={id} className={s.headTitle}>
          {title}
        </h2>
        {lead && <p className={s.lead}>{lead}</p>}
      </div>
      {aside && <div className={s.aside}>{aside}</div>}
    </div>
  )
}
