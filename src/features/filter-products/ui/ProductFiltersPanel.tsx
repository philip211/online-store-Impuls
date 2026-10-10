import clsx from 'clsx'
import { useId, type ReactNode } from 'react'

import { CATEGORY_IDS, CATEGORY_NAMES, PRICE_CAPS } from '@/entities/product'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { Checkbox, Chip, ChipGroup, text } from '@/shared/ui'

import { useProductFacets } from '../model/use-product-facets'
import { useProductFilters } from '../model/use-product-filters'
import s from './filters.module.css'

const Count = ({ value }: { value: number | undefined }) => (
  // Reserves its width while counts load, so options do not jump.
  <span className={s.count} aria-hidden="true">
    {value ?? ''}
  </span>
)

type Variant = 'list' | 'chips'

type FacetOptionProps = {
  label: string
  count: number | undefined
  active: boolean
  onSelect: () => void
  variant: Variant
}

/** Option with its match count. Empty options stay visible but disabled, so the shape never shifts. */
function FacetOption({ label, count, active, onSelect, variant }: FacetOptionProps) {
  const empty = count === 0 && !active
  const ariaLabel = count === undefined ? undefined : `${label}, ${pluralize(count, ITEM_FORMS)}`

  if (variant === 'list') {
    return (
      <li>
        <button
          type="button"
          className={s.row}
          aria-pressed={active}
          disabled={empty}
          aria-label={ariaLabel}
          onClick={onSelect}
        >
          <span>{label}</span>
          <Count value={count} />
        </button>
      </li>
    )
  }

  return (
    <Chip
      active={active}
      disabled={empty}
      className={s.facet}
      onClick={onSelect}
      aria-label={ariaLabel}
    >
      {label}
      <Count value={count} />
    </Chip>
  )
}

/** Sidebar: a hairline list; bottom sheet: wrapping chips. */
function Options({ variant, children }: { variant: Variant; children: ReactNode }) {
  return variant === 'list' ? (
    <ul className={s.list}>{children}</ul>
  ) : (
    <ChipGroup>{children}</ChipGroup>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    // A label for a control group, not a section heading: keeps the page outline starting at H1.
    <div className={s.group} role="group" aria-labelledby={id}>
      <p id={id} className={s.groupTitle}>
        {title}
      </p>
      {children}
    </div>
  )
}

type ProductFiltersPanelProps = {
  /** The bottom sheet has its own reset in the footer. */
  withReset?: boolean
  /** 'list' for the desktop sidebar, 'chips' for the bottom sheet. */
  variant?: Variant
}

export function ProductFiltersPanel({
  withReset = true,
  variant = 'chips',
}: ProductFiltersPanelProps) {
  const { filters, update, reset, isDirty } = useProductFilters()
  const { facets, isStale } = useProductFacets(filters)
  const stockCount = facets?.stock.inStock
  // A cap at or above the priciest product in the whole catalogue never narrows anything.
  // Decided against the catalogue, not the current filters, so options never pop in and out.
  const priceCaps = PRICE_CAPS.filter(
    (cap) =>
      cap.value === null ||
      filters.maxPrice === cap.value ||
      facets === undefined ||
      cap.value < facets.catalogMax,
  )

  return (
    <div className={clsx(s.panel, isStale && s.stale)}>
      <Group title="Категория">
        <Options variant={variant}>
          <FacetOption
            label="Все"
            count={facets?.category.all}
            active={filters.category === 'all'}
            variant={variant}
            onSelect={() => update({ category: 'all' })}
          />
          {CATEGORY_IDS.map((id) => (
            <FacetOption
              key={id}
              label={CATEGORY_NAMES[id]}
              count={facets?.category[id]}
              active={filters.category === id}
              variant={variant}
              onSelect={() => update({ category: id })}
            />
          ))}
        </Options>
      </Group>

      <Group title="Цена">
        <Options variant={variant}>
          {priceCaps.map((cap) => (
            <FacetOption
              key={cap.label}
              label={cap.label}
              count={facets?.price.find((p) => p.value === cap.value)?.count}
              active={filters.maxPrice === cap.value}
              variant={variant}
              onSelect={() => update({ maxPrice: cap.value })}
            />
          ))}
        </Options>
      </Group>

      <Group title="Наличие">
        <Checkbox
          className={s.stock}
          label={
            <>
              Только в наличии
              <Count value={stockCount} />
              {stockCount !== undefined && (
                <span className={text.srOnly}>, {pluralize(stockCount, ITEM_FORMS)}</span>
              )}
            </>
          }
          checked={filters.inStockOnly}
          disabled={stockCount === 0 && !filters.inStockOnly}
          onChange={(e) => update({ inStockOnly: e.target.checked })}
        />
      </Group>

      {withReset && isDirty && (
        <button type="button" className={s.reset} onClick={reset}>
          Сбросить фильтры
        </button>
      )}
    </div>
  )
}
