import { CloseIcon } from '@/shared/ui'

import { listActiveFilters } from '../model/active-filters'
import { useProductFilters } from '../model/use-product-filters'
import s from './filters.module.css'

/** Everything that narrows the list, each removable in one tap, plus a full reset. */
export function ActiveFilters() {
  const { filters, update, resetAll } = useProductFilters()
  const pills = listActiveFilters(filters)
  if (!pills.length) return null

  return (
    <ul className={s.pills} aria-label="Активные фильтры">
      {pills.map((pill) => (
        <li key={pill.key}>
          <button
            type="button"
            className={s.pill}
            onClick={() => update(pill.clear)}
            aria-label={`Убрать: ${pill.label}`}
          >
            {pill.label}
            <CloseIcon size={16} />
          </button>
        </li>
      ))}
      {pills.length > 1 && (
        <li>
          <button type="button" className={s.reset} onClick={resetAll}>
            Сбросить всё
          </button>
        </li>
      )}
    </ul>
  )
}
