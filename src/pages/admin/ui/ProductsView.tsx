import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router'

import { getImage, ProductImage } from '@/entities/product'
import { isApiError } from '@/shared/api'
import { routes } from '@/shared/config'
import { formatPrice, ITEM_FORMS, pluralize, toast } from '@/shared/lib'
import { ButtonLink, Chip, ChipGroup, Select } from '@/shared/ui'

import { adminApi, adminQueries, type AdminProduct } from '../api/admin-api'
import { useListParams } from '../model/use-list-params'
import s from './admin.module.css'
import { ListSkeleton, LoadError, Pager, SearchField } from './parts'

/** Stock edited in place: type a number, Enter or leaving the field saves it. */
function StockCell({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(String(product.stock))
  const mutation = useMutation({
    mutationFn: (stock: number) => adminApi.setStock(product.id, { stock }),
    onSuccess: (saved) => {
      setValue(String(saved.stock))
      toast(`«${saved.name}»: остаток ${saved.stock} шт.`)
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (e) => {
      setValue(String(product.stock))
      toast(isApiError(e) ? e.detail : 'Не получилось сохранить остаток')
    },
  })

  const save = () => {
    const next = Number(value)
    if (!Number.isInteger(next) || next < 0) return setValue(String(product.stock))
    if (next !== product.stock) mutation.mutate(next)
  }

  return (
    <span className={s.stock}>
      <input
        className={clsx(s.stockInput, product.stock === 0 && s.out)}
        inputMode="numeric"
        aria-label={`Остаток «${product.name}», штук`}
        value={value}
        disabled={mutation.isPending}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setValue(String(product.stock))
        }}
      />
    </span>
  )
}

export function ProductsView() {
  const { get, page, set } = useListParams()
  const category = get('category')
  const filter = get('filter')
  const { data: categories } = useQuery(adminQueries.categories())
  const { data, isError, isPlaceholderData } = useQuery(
    adminQueries.products({
      page,
      limit: 25,
      q: get('q') || undefined,
      category: category || undefined,
      active: filter === 'hidden' ? false : undefined,
      maxStock: filter === 'out' ? 0 : filter === 'low' ? 3 : undefined,
    }),
  )

  return (
    <section aria-labelledby="products-title">
      <title>Товары — управление Импульсом</title>
      <div className={clsx(s.listHead, s.chips)}>
        <h2 id="products-title" className={s.h2}>
          Товары
        </h2>
        <ButtonLink to={routes.adminProductNew()} size="sm">
          Добавить товар
        </ButtonLink>
      </div>

      <div className={s.toolbar}>
        <SearchField label="Поиск" placeholder="Название, бренд или slug" />
        <Select
          className={s.toolbarSelect}
          label="Раздел"
          value={category}
          onChange={(e) => set({ category: e.target.value })}
        >
          <option value="">Все разделы</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <ChipGroup role="group" aria-label="Показать" className={s.chips}>
        {[
          { id: '', label: 'Все' },
          { id: 'low', label: 'Заканчиваются' },
          { id: 'out', label: 'Нет в наличии' },
          { id: 'hidden', label: 'Сняты с продажи' },
        ].map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => set({ filter: f.id })}>
            {f.label}
          </Chip>
        ))}
      </ChipGroup>

      {isError && <LoadError />}
      {!data && !isError && <ListSkeleton />}
      {data?.items.length === 0 && <p className={s.empty}>Ничего не нашлось.</p>}

      {data && data.items.length > 0 && (
        <div
          className={clsx(s.tableWrap, isPlaceholderData && s.busy)}
          // Scrolls sideways on phones: focusable and named so the keyboard can scroll it too.
          tabIndex={0}
          role="region"
          aria-labelledby="products-title"
          aria-busy={isPlaceholderData || undefined}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th scope="col">Товар</th>
                <th scope="col">Раздел</th>
                <th scope="col" className={s.num}>
                  Цена
                </th>
                <th scope="col" className={s.num}>
                  Остаток, шт.
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const image = getImage(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={s.productCell}>
                        <span className={s.thumb}>
                          {image && (
                            <ProductImage image={image} sizes="48px" ratio="1 / 1" decorative />
                          )}
                        </span>
                        <span>
                          <Link to={routes.adminProduct(p.id)} viewTransition className={s.rowLink}>
                            {p.name}
                          </Link>
                          <span className={s.cellMeta}>
                            {p.kind}
                            {!p.isActive && ' · снят с продажи'}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>{p.categoryName}</td>
                    <td className={s.num}>
                      {formatPrice(p.price)}
                      {p.oldPrice && (
                        <span className={s.cellMeta}>было {formatPrice(p.oldPrice)}</span>
                      )}
                    </td>
                    <td className={s.num}>
                      <StockCell key={`${p.id}:${p.stock}`} product={p} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager meta={data?.meta} noun={(n) => pluralize(n, ITEM_FORMS)} />
    </section>
  )
}
