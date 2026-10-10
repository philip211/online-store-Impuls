import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { getImage, productQueries, ProductImage, type ProductImageData } from '@/entities/product'
import { useWishlistIds, useWishlistStore } from '@/entities/wishlist'
import { routes } from '@/shared/config'
import { formatPrice, ITEM_FORMS, pluralize, toast } from '@/shared/lib'
import { Button, CheckIcon, CloseIcon, IconButton, Skeleton, text } from '@/shared/ui'

import s from './favorites-page.module.css'

type SharedBannerProps = { slugs: string[]; onClose: () => void }

function SharedThumb({ image }: { image: ProductImageData | null }) {
  return (
    <span className={s.sharedThumb}>
      {image && <ProductImage image={image} sizes="56px" ratio="1 / 1" decorative />}
    </span>
  )
}

/** A list someone sent via "Поделиться подборкой"; nothing is saved until the visitor asks. */
export function SharedBanner({ slugs, onClose }: SharedBannerProps) {
  const { data, isError } = useQuery(productQueries.bySlugs(slugs))
  const wished = useWishlistIds()
  const toggle = useWishlistStore((st) => st.toggle)

  const products = data ?? []
  const missing = products.filter((p) => !wished.includes(p.id))

  const saveAll = () => {
    // The store puts new ids first; adding in reverse keeps the sender's order on top.
    for (const p of [...missing].reverse()) toggle(p.id)
    toast(`Сохранили в избранное: ${pluralize(missing.length, ITEM_FORMS)}`)
  }

  if (isError || (data && products.length === 0)) return null

  return (
    <section className={s.shared} aria-labelledby="h-shared">
      <div className={s.sharedHead}>
        <div>
          <h2 id="h-shared" className={s.sharedTitle}>
            Подборка, которой с вами поделились
          </h2>
          <p className={text.mono}>
            {data ? pluralize(products.length, ITEM_FORMS) : 'Загружаем товары…'}
          </p>
        </div>
        <IconButton label="Скрыть подборку" onClick={onClose}>
          <CloseIcon size={20} />
        </IconButton>
      </div>

      {data ? (
        <ul className={s.sharedList}>
          {products.map((p) => (
            <li key={p.id}>
              <Link to={routes.product(p.slug)} viewTransition className={s.sharedItem}>
                <SharedThumb image={getImage(p)} />
                <span className={s.sharedName}>
                  {p.name}
                  <span className={text.mono}>{p.kind}</span>
                </span>
                <span className={s.sharedPrice} data-numeric>
                  {formatPrice(p.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.sharedList} aria-hidden="true">
          <Skeleton />
          <Skeleton variant="short" />
        </div>
      )}

      <div className={s.sharedFoot} aria-live="polite">
        {data &&
          (missing.length > 0 ? (
            <Button onClick={saveAll}>
              {missing.length === products.length
                ? 'Сохранить всё в избранное'
                : `Сохранить ещё ${pluralize(missing.length, ITEM_FORMS)}`}
            </Button>
          ) : (
            <p className={s.sharedDone}>
              <CheckIcon size={18} />
              Всё из подборки уже в вашем избранном
            </p>
          ))}
      </div>
    </section>
  )
}

/** A link made before the catalogue update: its products cannot be told apart safely. */
export function ExpiredShareBanner({ onClose }: { onClose: () => void }) {
  return (
    <section className={s.shared} aria-labelledby="h-shared">
      <div className={s.sharedHead}>
        <div>
          <h2 id="h-shared" className={s.sharedTitle}>
            Ссылка на подборку устарела
          </h2>
          <p className={s.ownEmpty}>
            Её создали до обновления каталога, поэтому показать товары мы не можем. Попросите
            прислать новую ссылку.
          </p>
        </div>
        <IconButton label="Скрыть сообщение" onClick={onClose}>
          <CloseIcon size={20} />
        </IconButton>
      </div>
    </section>
  )
}
