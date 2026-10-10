import clsx from 'clsx'

import type { PhotoCredit } from '../model/types'
import s from './image.module.css'

/** Unsplash asks apps to tag attribution links as referrals. */
const referral = (url: string) => `${url}?utm_source=impulse&utm_medium=referral`

type CreditProps = { credit: PhotoCredit | null; className?: string }

/** "Фото: Автор / Unsplash", with links to the author and the photo page. */
export function Credit({ credit, className }: CreditProps) {
  // The shop's own photos need no attribution.
  if (!credit) return null
  return (
    <p className={clsx(s.credit, className)}>
      Фото: <a href={referral(credit.authorUrl)}>{credit.author}</a>
      {' / '}
      <a href={referral(credit.sourceUrl)}>Unsplash</a>
    </p>
  )
}
