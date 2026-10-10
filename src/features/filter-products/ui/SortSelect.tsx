import clsx from 'clsx'

import { isProductSort, SORT_OPTIONS } from '@/entities/product'
import { ChevronLeftIcon } from '@/shared/ui'

import { useProductFilters } from '../model/use-product-filters'
import s from './filters.module.css'

export function SortSelect({ className }: { className?: string }) {
  const { filters, update } = useProductFilters()

  return (
    <label className={clsx(s.sortLabel, className)}>
      <span className={s.sortCaption}>Сортировка</span>
      <span className={s.selectWrap}>
        <select
          className={s.select}
          value={filters.sort}
          onChange={(e) => isProductSort(e.target.value) && update({ sort: e.target.value })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronLeftIcon size={16} className={s.chevron} />
      </span>
    </label>
  )
}
