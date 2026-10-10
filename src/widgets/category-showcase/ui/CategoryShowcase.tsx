import clsx from 'clsx'
import { Link } from 'react-router'

import { ProductImage, type Category, type CategoryId } from '@/entities/product'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ArrowRightIcon, Section, SectionHeader, text } from '@/shared/ui'

import s from './category-showcase.module.css'

const TAGLINES: Record<CategoryId, string> = {
  sound: 'Наушники с шумоподавлением и колонки, которые не боятся воды.',
  mobile: 'Смартфоны и умные часы.',
  photo: 'Моментальная печать.',
  desk: 'Ноутбуки, клавиатуры и электронные книги.',
}

/** Rendered tile widths: the lead tile is half the row, the others a quarter (phones: half or full). */
const TILE_SIZES: Record<CategoryId, string> = {
  sound: '(min-width: 1320px) 640px, (min-width: 768px) 50vw, 100vw',
  mobile: '(min-width: 1320px) 320px, (min-width: 768px) 25vw, 50vw',
  photo: '(min-width: 1320px) 320px, (min-width: 768px) 25vw, 50vw',
  desk: '(min-width: 1320px) 320px, (min-width: 768px) 25vw, 100vw',
}

/**
 * Narrowest width / height each tile reaches (phones or desktop, see the CSS): photos are
 * cropped with object-fit: cover, so a narrow tile draws a landscape photo wider than itself.
 */
const TILE_ASPECT: Record<CategoryId, number> = { sound: 1, mobile: 0.8, photo: 0.8, desk: 0.5 }

/**
 * Bento of photographs: the lead category gets the large tile, the desk tile stands tall
 * for its portrait shot. Each photo runs edge to edge under a soft scrim that carries the copy.
 */
export function CategoryShowcase({ categories }: { categories: Category[] }) {
  return (
    <Section aria-labelledby="h-cats">
      <SectionHeader
        id="h-cats"
        eyebrow="Каталог"
        title="Выберите раздел"
        lead="Четыре направления. В каждом — только то, что мы проверили сами."
      />
      <div className={s.bento}>
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`${routes.catalog()}?cat=${c.id}`}
            viewTransition
            className={clsx(s.cat, s[c.id], c.cover.image && s.hasPhoto, text.reveal)}
          >
            {c.cover.image && (
              <ProductImage
                image={c.cover.image}
                sizes={TILE_SIZES[c.id]}
                frameAspect={TILE_ASPECT[c.id]}
                decorative
                className={s.media}
              />
            )}
            <span className={s.copy}>
              <span className={s.name}>{c.name}</span>
              <span className={s.tagline}>{TAGLINES[c.id]}</span>
              <span className={s.more}>
                {pluralize(c.count, ITEM_FORMS)}
                <ArrowRightIcon size={16} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Section>
  )
}
