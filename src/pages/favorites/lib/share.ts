import { routes } from '@/shared/config'
import { formatPrice } from '@/shared/lib'

/** Hard cap so a hand-edited link cannot make us fetch an absurd list. */
const MAX_SHARED = 50
/** Query parameter of a shared list: product slugs, which survive catalogue renumbering. */
export const SHARE_PARAM = 'items'
/**
 * Parameter of links made before the photo catalogue, which carried product ids. Those ids now
 * point at other products, so such a link is reported as expired rather than resolved.
 */
export const LEGACY_SHARE_PARAM = 'share'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** "sony-wh-1000xm5,X,sony-wh-1000xm5" → ['sony-wh-1000xm5']: valid slugs, deduplicated, order kept. */
export function parseShareSlugs(value: string | null): string[] {
  if (!value) return []
  const slugs = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => SLUG.test(part))
  return [...new Set(slugs)].slice(0, MAX_SHARED)
}

export const sharePath = (slugs: readonly string[]) =>
  `${routes.favorites()}?${SHARE_PARAM}=${slugs.join(',')}`

type MailItem = { name: string; price: number; slug: string }

/** mailto: link with the list written out, so a consultant can answer without opening the site. */
export function consultMailto(email: string, origin: string, items: readonly MailItem[]): string {
  const lines = items.map(
    (p, i) =>
      `${i + 1}. ${p.name} — ${formatPrice(p.price)}\n   ${origin}${routes.product(p.slug)}`,
  )
  const body = [
    'Здравствуйте. Помогите, пожалуйста, выбрать из моего избранного:',
    '',
    ...lines,
    '',
    `Вся подборка: ${origin}${sharePath(items.map((p) => p.slug))}`,
  ]
  const subject = 'Вопрос по подборке из избранного'
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join('\n'))}`
}
