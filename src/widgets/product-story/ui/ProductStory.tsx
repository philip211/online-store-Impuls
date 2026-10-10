import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import {
  CATEGORY_NAMES,
  getImage,
  ProductImage,
  type ImageRole,
  type Product,
  type ProductImageData,
} from '@/entities/product'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ArrowRightIcon, ButtonLink, Container, text } from '@/shared/ui'

import s from './product-story.module.css'

/**
 * Editorial chapters for the hero product; the numbers match its spec sheet. `photo` is the
 * kind of shot that suits the chapter: the catalogue shot for noise, the travel flat lay for
 * battery, the close-up of the ear cushions for comfort.
 */
const CHAPTERS: readonly {
  value: string
  unit: string
  title: string
  body: string
  photo: ImageRole
}[] = [
  {
    photo: 'primary',
    value: '8',
    unit: 'микрофонов',
    title: 'Тишина в метро',
    body: 'Микрофоны слушают всё вокруг и гасят гул вагона, кондиционер и разговоры за соседним столом. Собеседник в звонке слышит вас, а не улицу.',
  },
  {
    value: '30',
    unit: 'часов',
    photo: 'context',
    title: 'Неделя поездок на одном заряде',
    body: 'Хватает на перелёт туда и обратно. Забыли зарядить — три минуты от розетки дают ещё три часа музыки.',
  },
  {
    value: '250',
    unit: 'граммов',
    photo: 'gallery',
    title: 'Не давят даже к вечеру',
    body: 'Мягкие амбушюры и оголовье без жёстких углов. В чехле наушники складываются плоско и занимают место тонкой книги.',
  },
]

/** The sticky stage is half the container from 900px; a still image across the column below. */
const STAGE_SIZES = '(min-width: 1320px) 620px, (min-width: 900px) 46vw, 100vw'
/** The stage is 4:5 (see .stage), so landscape shots are drawn wider than it. */
const STAGE_ASPECT = 4 / 5

/** One photo per chapter, preferring a different shot each time; repeats only if the product has fewer. */
function chapterPhotos(product: Product): (ProductImageData | null)[] {
  const used = new Set<string>()
  return CHAPTERS.map(({ photo }) => {
    const exact = product.images.find((img) => img.role === photo && !used.has(img.id))
    const unused = product.images.find((img) => !used.has(img.id))
    const image = exact ?? unused ?? getImage(product, { role: photo })
    if (image) used.add(image.id)
    return image
  })
}

type ProductStoryProps = {
  product: Product
  /** How many products share the product's section, for a "see all" link that names its scope. */
  sectionCount: number
}

/**
 * Sticky product with chapters scrolling past it. An IntersectionObserver only flips
 * `data-chapter`; the photos crossfade with a plain CSS opacity transition, so without JS
 * the story is the same text beside the first photo, and with reduced motion the photos
 * swap without a fade.
 */
export function ProductStory({ product, sectionCount }: ProductStoryProps) {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    // A thin band across the middle of the viewport decides which chapter is current.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const index = e.target.getAttribute('data-index')
          if (e.isIntersecting && index) root.dataset.chapter = index
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el))
    root.dataset.chapter = '0'
    return () => io.disconnect()
  }, [])

  const photos = chapterPhotos(product)
  // Phones see one still photo; the second shot, so it does not repeat the hero right above.
  const still = photos[1] ? 1 : 0
  const section = CATEGORY_NAMES[product.category]

  return (
    <section ref={rootRef} className={s.story} aria-labelledby="h-story">
      <Container className={s.layout}>
        <header className={s.head}>
          <p className={s.kicker}>{product.name}</p>
          <h2 id="h-story" className={s.title}>
            Три цифры, которые чувствуешь каждый день
          </h2>
        </header>

        <div className={s.stageCol}>
          <figure className={s.stage}>
            {photos.map(
              (image, i) =>
                image && (
                  <ProductImage
                    key={`${i}-${image.id}`}
                    image={image}
                    sizes={STAGE_SIZES}
                    frameAspect={STAGE_ASPECT}
                    // One shot carries the alt text; the others are variations of the same product.
                    decorative={i !== still}
                    className={clsx(s.shot, i === still && s.still)}
                  />
                ),
            )}
            <figcaption className={s.dots} aria-hidden="true">
              {CHAPTERS.map((c, i) => (
                <span key={c.unit} data-dot={i} />
              ))}
            </figcaption>
          </figure>
        </div>

        <ol className={s.chapters}>
          {CHAPTERS.map((c, i) => (
            <li key={c.unit} className={s.chapter} data-index={i}>
              <p className={s.figure} data-numeric>
                <span className={s.value}>{c.value}</span> {c.unit}
              </p>
              <h3 className={s.chapterTitle}>{c.title}</h3>
              <p className={s.body}>{c.body}</p>
            </li>
          ))}
        </ol>

        <div className={s.foot}>
          <ButtonLink to={routes.product(product.slug)} variant="secondary" className={s.cta}>
            <span className={s.label}>
              Подробнее о <span className={s.nowrap}>{product.name}</span>
            </span>
            <ArrowRightIcon size={18} />
          </ButtonLink>
          {sectionCount > 1 && (
            <Link to={routes.category(product.category)} className={s.more}>
              Все {pluralize(sectionCount, ITEM_FORMS)} в разделе «{section}»
            </Link>
          )}
          <p className={text.mono}>Время работы и вес — по данным производителя.</p>
        </div>
      </Container>
    </section>
  )
}
