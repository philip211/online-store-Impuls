import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { routes } from '@/shared/config'
import { ChevronLeftIcon } from '@/shared/ui'

import { adminQueries } from '../api/admin-api'
import s from './admin.module.css'
import { ListSkeleton, LoadError } from './parts'
import { ProductEditor } from './ProductEditor'

const Back = () => (
  <nav aria-label="Хлебные крошки" className={s.crumbs}>
    <Link to={routes.adminProducts()} viewTransition className={s.back}>
      <ChevronLeftIcon size={20} />
      Товары
    </Link>
  </nav>
)

export function ProductNewView() {
  return (
    <article aria-labelledby="product-title">
      <title>Новый товар — управление Импульсом</title>
      <Back />
      <h2 id="product-title" className={s.detailTitle}>
        Новый товар
      </h2>
      <ProductEditor />
    </article>
  )
}

export function ProductView() {
  const id = Number(useParams().id)
  const { data: product, isError } = useQuery({
    ...adminQueries.product(id),
    enabled: Number.isInteger(id) && id > 0,
  })

  if (isError) {
    return (
      <>
        <Back />
        <LoadError />
      </>
    )
  }
  if (!product) {
    return (
      <>
        <Back />
        <ListSkeleton rows={4} />
      </>
    )
  }

  return (
    <article aria-labelledby="product-title">
      <title>{`${product.name} — управление Импульсом`}</title>
      <Back />
      <header className={s.detailHead}>
        <h2 id="product-title" className={s.detailTitle}>
          {product.name}
        </h2>
        {product.isActive && (
          <Link to={routes.product(product.slug)} viewTransition className={s.rowLink}>
            Открыть на витрине
          </Link>
        )}
      </header>
      <p className={s.muted}>
        {product.categoryName} · {product.slug}
      </p>

      {/* Keyed by id, not updatedAt: a background refetch must not wipe unsaved edits. */}
      <ProductEditor key={product.id} product={product} />
    </article>
  )
}
