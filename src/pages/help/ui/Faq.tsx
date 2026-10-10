import type { ReactNode } from 'react'

import { PlusIcon } from '@/shared/ui'

import s from './topic.module.css'

export type FaqItem = { q: string; a: ReactNode }

/** Native disclosure: keyboard, find-in-page and screen readers work without JS. */
export function Faq({ title = 'Частые вопросы', items }: { title?: string; items: FaqItem[] }) {
  return (
    <section className={s.block}>
      <h2 className={s.h2}>{title}</h2>
      <div className={s.faq}>
        {items.map((item) => (
          <details key={item.q} className={s.qa}>
            <summary>
              <span>{item.q}</span>
              <PlusIcon className={s.qaIcon} />
            </summary>
            <div className={s.answer}>{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}
