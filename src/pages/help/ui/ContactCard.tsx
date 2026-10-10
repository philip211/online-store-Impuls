import clsx from 'clsx'
import { useId } from 'react'

import { SUPPORT } from '@/shared/config'

import s from './help.module.css'

const TELEGRAM_HANDLE = `@${SUPPORT.telegram.split('/').pop() ?? ''}`

type ContactCardProps = {
  title?: string
  className?: string
}

/** The human service layer: real channels, hours and an honest response time. */
export function ContactCard({ title = 'Связаться с человеком', className }: ContactCardProps) {
  const id = useId()
  return (
    <section className={clsx(s.card, className)} aria-labelledby={id}>
      <h2 id={id} className={s.cardTitle}>
        {title}
      </h2>
      <p className={s.cardLead}>
        Отвечают сотрудники магазина, не бот. Обычно отвечаем за 5 минут.
      </p>
      <ul className={s.channels}>
        <li>
          <a href={SUPPORT.phoneHref}>
            <span>Телефон</span>
            <b data-numeric>{SUPPORT.phone}</b>
          </a>
        </li>
        <li>
          <a href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer">
            <span>Telegram</span>
            <b>{TELEGRAM_HANDLE}</b>
          </a>
        </li>
        <li>
          <a href={`mailto:${SUPPORT.email}`}>
            <span>Почта</span>
            <b>{SUPPORT.email}</b>
          </a>
        </li>
      </ul>
      <p className={s.cardHours}>{SUPPORT.hours}. Звонок по России бесплатный.</p>
    </section>
  )
}
