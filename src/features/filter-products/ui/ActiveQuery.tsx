import { CloseIcon } from '@/shared/ui'

import { useProductFilters } from '../model/use-product-filters'
import s from './filters.module.css'

/** Removable pill for the current text search on its own (ActiveFilters includes it too). */
export function ActiveQuery() {
  const { filters, update } = useProductFilters()
  if (!filters.query) return null

  return (
    <button
      type="button"
      className={s.pill}
      onClick={() => update({ query: '' })}
      aria-label={`Сбросить поиск «${filters.query}»`}
    >
      Поиск: «{filters.query}»
      <CloseIcon size={16} />
    </button>
  )
}
