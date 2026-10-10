import { useEffect } from 'react'

import { ProductFiltersPanel, useProductFilters } from '@/features/filter-products'
import { ITEM_FORMS, pluralize } from '@/shared/lib'
import { Button, CloseIcon, Dialog, IconButton, text } from '@/shared/ui'

import s from './catalog-page.module.css'

/** Matches the breakpoint where the sidebar takes over (catalog-page.module.css). */
const DESKTOP = '(min-width: 1200px)'

type FilterSheetProps = {
  open: boolean
  onClose: () => void
  /** Live result size for the current filters; undefined while the first count loads. */
  total: number | undefined
}

/**
 * Mobile filters in a bottom sheet. Choices apply to the URL immediately, so the
 * footer button only closes the sheet — its count is always the real result.
 */
export function FilterSheet({ open, onClose, total }: FilterSheetProps) {
  const { reset, isDirty } = useProductFilters()

  // The sheet is meaningless next to the sidebar: close it when the viewport grows.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia(DESKTOP)
    const onChange = () => mq.matches && onClose()
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [open, onClose])

  const result = total === undefined ? null : pluralize(total, ITEM_FORMS)

  return (
    <Dialog open={open} onClose={onClose} variant="bottom" label="Фильтры" className={s.sheet}>
      {/* The whole header is a drag zone for the sheet (the Dialog ignores its buttons). */}
      <div className={s.sheetHead} data-drag>
        <h2 className={s.sheetTitle}>Фильтры</h2>
        <IconButton label="Закрыть фильтры" onClick={onClose}>
          <CloseIcon size={22} />
        </IconButton>
      </div>

      <div className={s.sheetBody}>
        <ProductFiltersPanel withReset={false} />
      </div>

      <div className={s.sheetFoot}>
        <Button variant="secondary" onClick={reset} disabled={!isDirty}>
          Сбросить
        </Button>
        <Button className={s.sheetShow} onClick={onClose}>
          {result === null
            ? 'Показать товары'
            : total === 0
              ? 'Ничего не найдено'
              : `Показать ${result}`}
        </Button>
        <p className={text.srOnly} aria-live="polite">
          {result && `Найдено: ${result}`}
        </p>
      </div>
    </Dialog>
  )
}
