import type { Product } from '@/entities/product'
import { SUPPORT } from '@/shared/config'
import { toast } from '@/shared/lib'
import { Button, buttonClass } from '@/shared/ui'

import { consultMailto, sharePath } from '../lib/share'
import s from './favorites-page.module.css'

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

async function shareLink(url: string) {
  const canShare = typeof navigator.share === 'function'
  // On phones the system share sheet is the natural place; on desktop a copied link is.
  if (canShare && window.matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: 'Подборка из Импульса', url })
      return
    } catch (e) {
      if (isAbort(e)) return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    toast('Ссылка на подборку скопирована')
  } catch {
    if (canShare) {
      await navigator.share({ title: 'Подборка из Импульса', url }).catch(() => undefined)
      return
    }
    toast('Не получилось скопировать ссылку. Попробуйте ещё раз')
  }
}

export function FavoritesActions({ products }: { products: Product[] }) {
  const origin = window.location.origin
  const slugs = products.map((p) => p.slug)

  return (
    <div className={s.actions}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void shareLink(origin + sharePath(slugs))}
      >
        Поделиться подборкой
      </Button>
      <a
        href={consultMailto(SUPPORT.email, origin, products)}
        className={buttonClass({ variant: 'secondary', size: 'sm' })}
      >
        Отправить консультанту
      </a>
    </div>
  )
}
