import { keepPreviousData, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useCallback, useState } from 'react'

import {
  ActiveFilters,
  ProductFiltersPanel,
  SortSelect,
  useProductFacets,
  useProductFilters,
} from '@/features/filter-products'
import { CATEGORY_NAMES, productQueries, type CategoryId } from '@/entities/product'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { Button, Container, EmptyState, FilterIcon, text } from '@/shared/ui'
import { ProductGrid, ProductGridSkeleton } from '@/widgets/product-grid'

import { CatalogEmpty } from './CatalogEmpty'
import s from './catalog-page.module.css'
import { FilterSheet } from './FilterSheet'

/** Same voice as the home bento, one quiet line under the section title. */
const LEDES: Record<CategoryId | 'all', string> = {
  all: 'Четыре направления. В каждом — только то, что мы проверили сами.',
  sound: 'Наушники с шумоподавлением и колонки, которые не боятся воды.',
  mobile: 'Смартфоны и умные часы.',
  photo: 'Моментальная печать.',
  desk: 'Клавиатуры, электронные книги и аккумуляторы.',
}

export function CatalogPage() {
  const { filters, update, activeCount } = useProductFilters()
  // Previous results stay on screen (dimmed) while new ones load — no layout jump.
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    ...productQueries.list(filters),
    placeholderData: keepPreviousData,
  })
  // The list endpoint returns products only; the (usually cached) palette query knows the repair.
  const { data: search, isPlaceholderData: searchStale } = useQuery({
    ...productQueries.search(filters.query),
    placeholderData: keepPreviousData,
  })
  const correction =
    filters.query && search && !searchStale && data && data.length > 0
      ? search.correctedQuery
      : null
  const { facets } = useProductFacets(filters)

  // Remount the results only when settled data arrives (not on the click): new cards mount
  // fresh and fade in instead of surviving cards being scored as a layout shift.
  const [settled, setSettled] = useState({ data, key: 0 })
  if (data !== settled.data && !isPlaceholderData) setSettled({ data, key: settled.key + 1 })
  const resultsKey = settled.key
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  const section = filters.category === 'all' ? 'Каталог' : CATEGORY_NAMES[filters.category]
  const shown = correction ?? filters.query
  const title = filters.query ? `Поиск: «${shown}»` : section
  const lede = filters.query ? null : LEDES[filters.category]
  const busy = isPending || isPlaceholderData

  return (
    <Container page className={s.layout}>
      <title>{`${filters.query ? `«${shown}» — поиск` : section} — Импульс`}</title>

      <aside className={s.side} aria-label="Фильтры">
        <ProductFiltersPanel variant="list" />
      </aside>

      <div className={s.main}>
        <div className={s.toolbar}>
          <div className={s.heading}>
            <h1 className={s.title}>{title}</h1>
            {lede && <p className={s.lede}>{lede}</p>}
            {/* Old count stays (dimmed) until the new one is known, so it is announced once. */}
            <p className={clsx(s.count, busy && s.countBusy)} aria-live="polite">
              {isPending
                ? 'Загружаем товары…'
                : data && `Найдено: ${pluralize(data.length, ITEM_FORMS)}`}
            </p>
            <div aria-live="polite">
              {correction && (
                <p className={s.correction}>
                  Исправили опечатку в «{filters.query}».{' '}
                  <button
                    type="button"
                    className={s.correctionLink}
                    onClick={() => update({ query: correction })}
                  >
                    Оставить исправление
                  </button>
                </p>
              )}
            </div>
          </div>

          <div className={s.controls}>
            <Button
              variant="secondary"
              size="sm"
              className={s.trigger}
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
            >
              <FilterIcon size={20} />
              Фильтры
              {activeCount > 0 && (
                <>
                  <span className={s.triggerCount} aria-hidden="true">
                    {activeCount}
                  </span>
                  <span className={text.srOnly}>, активно: {activeCount}</span>
                </>
              )}
            </Button>
            <SortSelect className={s.sort} />
          </div>
        </div>

        <div className={s.active}>
          <ActiveFilters />
        </div>

        {isPending ? (
          <ProductGridSkeleton count={6} />
        ) : isError && !data ? (
          <EmptyState
            as="h2"
            size="section"
            title="Не удалось загрузить"
            description="Проверьте соединение и попробуйте ещё раз."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Повторить
              </Button>
            }
          />
        ) : data && data.length > 0 ? (
          <div
            key={resultsKey}
            className={clsx(s.results, isPlaceholderData && s.stale)}
            aria-busy={busy}
          >
            <ProductGrid products={data} priorityCount={3} highPriorityCount={2} />
          </div>
        ) : (
          <div
            key={resultsKey}
            className={clsx(s.results, s.noResults, isPlaceholderData && s.stale)}
            aria-busy={busy}
          >
            <CatalogEmpty facets={facets} />
          </div>
        )}
      </div>

      <FilterSheet open={sheetOpen} onClose={closeSheet} total={facets?.total ?? data?.length} />
    </Container>
  )
}
