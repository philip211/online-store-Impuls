import type { RefObject } from 'react'
import { Link } from 'react-router'

import {
  CATEGORY_NAMES,
  getImage,
  PriceTag,
  ProductImage,
  type ProductImageData,
} from '@/entities/product'
import { routes } from '@/shared/config'
import { formatPrice } from '@/shared/lib'
import { ArrowRightIcon, Button, ButtonLink, ChevronLeftIcon, Skeleton, text } from '@/shared/ui'

import type { FinderAnswers } from '../model/answers'
import type { FinderPick } from '../model/score'
import { catalogSearch } from '../model/use-finder'
import s from './finder.module.css'

type FinderResultsProps = {
  answers: FinderAnswers
  picks: FinderPick[] | null
  isError: boolean
  summary: string[]
  headingRef: RefObject<HTMLHeadingElement | null>
  onBack: () => void
  onRestart: () => void
  onRetry: () => void
}

const COUNT_WORDS = ['', 'Один вариант', 'Два варианта', 'Три варианта'] as const

/** One column on phones, three from 768px inside the finder's container. */
const PICK_SIZES = '(min-width: 1280px) 400px, (min-width: 768px) 32vw, calc(100vw - 32px)'

function PickPhoto({ image }: { image: ProductImageData | null }) {
  return image && <ProductImage image={image} sizes={PICK_SIZES} ratio="4 / 3" decorative />
}

export function FinderResults({
  answers,
  picks,
  isError,
  summary,
  headingRef,
  onBack,
  onRestart,
  onRetry,
}: FinderResultsProps) {
  const catalogHref = routes.catalog() + catalogSearch(answers, picks)
  const anyOver = picks?.some((p) => p.overBudget > 0) ?? false

  const title = !picks
    ? 'Подбираем'
    : picks.length
      ? `${COUNT_WORDS[picks.length] ?? 'Варианты'} для вас`
      : 'Ничего не нашлось'

  return (
    <section className={s.screen} aria-labelledby="finder-results" aria-busy={!picks && !isError}>
      <div className={s.progress}>
        <p className={s.count}>Подборка готова</p>
        <span className={s.path}>{summary.join(' · ')}</span>
      </div>

      <h2 id="finder-results" ref={headingRef} tabIndex={-1} className={s.question}>
        {title}
      </h2>

      <div aria-live="polite">
        {isError ? (
          <p className={s.note}>
            Не получилось загрузить каталог.{' '}
            <button type="button" className={s.inlineBtn} onClick={onRetry}>
              Попробовать ещё раз
            </button>
          </p>
        ) : !picks ? (
          <div className={s.results}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="tile" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <p className={s.note}>
            Под эти ответы в каталоге пока ничего нет. Попробуйте другой бюджет или загляните в
            каталог целиком.
          </p>
        ) : (
          <>
            {anyOver && (
              <p className={s.note}>
                В пределах бюджета подходящего не нашлось — показываем ближайшее по цене и отмечаем,
                насколько дороже.
              </p>
            )}
            <ol className={s.results}>
              {picks.map(({ product: p, reason, overBudget }) => (
                <li key={p.id} className={s.pick}>
                  <Link to={routes.product(p.slug)} viewTransition className={s.pickLink}>
                    <span className={s.pickTile}>
                      <PickPhoto image={getImage(p)} />
                    </span>
                    <span className={text.mono}>
                      {p.kind} · {CATEGORY_NAMES[p.category]}
                    </span>
                    <span className={s.pickName}>{p.name}</span>
                  </Link>
                  <p className={s.reason}>
                    <span className={s.reasonLabel}>Почему подходит</span>
                    {reason}
                  </p>
                  <div className={s.pickFoot}>
                    <PriceTag product={p} />
                    <span className={s.pickMeta}>
                      {overBudget > 0 && <span>На {formatPrice(overBudget)} выше бюджета</span>}
                      {!p.inStock && <span>Нет в наличии</span>}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      <div className={s.nav}>
        <Button variant="secondary" onClick={onBack}>
          <ChevronLeftIcon size={18} />
          Назад
        </Button>
        <Button variant="secondary" onClick={onRestart}>
          Пройти заново
        </Button>
        <ButtonLink to={catalogHref} variant="secondary">
          Показать в каталоге
          <ArrowRightIcon size={18} />
        </ButtonLink>
      </div>
    </section>
  )
}
