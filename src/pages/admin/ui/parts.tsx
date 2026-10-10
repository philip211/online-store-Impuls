import { useEffect, useState } from 'react'

import { useDebouncedValue } from '@/shared/lib'
import { Alert, Button, Skeleton, TextField } from '@/shared/ui'

import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'

/** Search box that writes to the URL a moment after typing stops. */
export function SearchField({ label, placeholder }: { label: string; placeholder: string }) {
  const { get, set } = useListParams()
  const [value, setValue] = useState(get('q'))
  const debounced = useDebouncedValue(value, 300)

  useEffect(() => {
    if (debounced.trim() !== get('q')) set({ q: debounced.trim() })
    // Only typing should write to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <TextField
      className={s.search}
      label={label}
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

type PagerProps = {
  meta: { page: number; pages: number; total: number } | undefined
  noun: (n: number) => string
}

export function Pager({ meta, noun }: PagerProps) {
  const { set } = useListParams()
  if (!meta || meta.total === 0) return null
  return (
    <div className={s.pager}>
      <p className={s.muted} aria-live="polite">
        {noun(meta.total)}
        {meta.pages > 1 && ` · страница ${meta.page} из ${meta.pages}`}
      </p>
      {meta.pages > 1 && (
        <div className={s.pagerButtons}>
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page <= 1}
            onClick={() => set({ page: meta.page - 1 })}
          >
            Назад
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page >= meta.pages}
            onClick={() => set({ page: meta.page + 1 })}
          >
            Дальше
          </Button>
        </div>
      )}
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={s.loading} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={s.sk} />
      ))}
    </div>
  )
}

export function LoadError() {
  return <Alert>Не удалось загрузить данные. Обновите страницу.</Alert>
}
