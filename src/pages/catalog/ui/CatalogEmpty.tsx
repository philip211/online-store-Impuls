import { Link } from 'react-router'

import { filterLabel, useProductFilters } from '@/features/filter-products'
import { matchHelpTopics } from '@/features/search-products'
import { rankRelaxations, type ProductFacets } from '@/entities/product'
import { routes } from '@/shared/config'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { ArrowRightIcon, Button, EmptyState } from '@/shared/ui'

import s from './catalog-page.module.css'

/**
 * A dead end that always offers a way forward: service answers for non-product
 * queries ("возврат"), otherwise the one filter whose removal brings back the most.
 */
export function CatalogEmpty({ facets }: { facets: ProductFacets | undefined }) {
  const { filters, update, resetAll, activeCount } = useProductFilters()
  const topics = filters.query ? matchHelpTopics(filters.query) : []
  const best = facets ? rankRelaxations(filters, facets)[0] : undefined
  const bestName =
    best &&
    (best.key === 'query' ? `запроса «${filters.query}»` : `«${filterLabel(best.key, filters)}»`)
  const canReset = activeCount > 0 || filters.query !== ''

  if (topics.length > 0) {
    return (
      <EmptyState
        as="h2"
        size="section"
        title="Среди товаров такого нет"
        description={
          <>
            По запросу «{filters.query}» товаров не нашлось, но, похоже, вы ищете ответ на вопрос.
          </>
        }
        action={
          <div className={s.emptyActions}>
            <ul className={s.topics} aria-label="Похоже, вы ищете">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link viewTransition to={routes.help(t.id)} className={s.topic}>
                    <span>
                      <b>{t.title}</b>
                      <span className={s.topicSummary}>{t.summary}</span>
                    </span>
                    <ArrowRightIcon size={20} />
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" className={s.textButton} onClick={resetAll}>
              Сбросить поиск и фильтры
            </button>
          </div>
        }
      />
    )
  }

  return (
    <EmptyState
      as="h2"
      size="section"
      title="Ничего не нашлось"
      description={
        best
          ? `Больше всего сужает выбор одно условие: без ${bestName} найдётся ${pluralize(best.count, ITEM_FORMS)}.`
          : filters.query
            ? `По запросу «${filters.query}» товаров нет. Попробуйте другое слово или название бренда.`
            : 'Под такие условия товаров нет.'
      }
      action={
        <div className={s.emptyActions}>
          {best && (
            <Button variant="secondary" onClick={() => update(best.patch)}>
              {best.key === 'query' ? 'Сбросить поиск' : `Убрать ${bestName}`}
            </Button>
          )}
          {canReset && (
            <button type="button" className={s.textButton} onClick={resetAll}>
              Сбросить всё
            </button>
          )}
        </div>
      }
    />
  )
}
