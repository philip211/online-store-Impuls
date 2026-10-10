import clsx from 'clsx'
import type { ReactNode } from 'react'

import s from './empty-state.module.css'

type EmptyStateProps = {
  title: string
  description: ReactNode
  action?: ReactNode
  /** Heading level: `h1` for a whole page (404, empty cart), `h3` inside a titled section. */
  as?: 'h1' | 'h2' | 'h3'
  /** `page` sets the title at the page-H1 scale; `section` stays quieter under an existing H1. */
  size?: 'page' | 'section'
  /** Optional static illustration (e.g. a product render), injected by upper layers. */
  art?: ReactNode
  /** @deprecated Icons in discs are no longer drawn; kept so older call sites still compile. */
  icon?: ReactNode
}

/** An open, hairline-topped message: no box, no icon disc. */
export function EmptyState({
  title,
  description,
  action,
  as: Heading = 'h2',
  size = 'section',
  art,
}: EmptyStateProps) {
  return (
    <section className={clsx(s.empty, s[size], art != null && s.withArt)}>
      <div className={s.main}>
        <Heading className={s.title}>{title}</Heading>
        <p className={s.desc}>{description}</p>
        {action && <div className={s.actions}>{action}</div>}
      </div>
      {art != null && (
        <div className={s.art} aria-hidden="true">
          {art}
        </div>
      )}
    </section>
  )
}
