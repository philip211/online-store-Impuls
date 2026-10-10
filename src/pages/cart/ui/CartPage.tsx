import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'

import { CartCheckout } from '@/widgets/cart-checkout'
import { dismissCartUndo } from '@/features/edit-cart-line'
import { useCartCount } from '@/entities/cart'
import { routes } from '@/shared/config'
import { ButtonLink, Container, EmptyState } from '@/shared/ui'

import s from './cart-page.module.css'

export function CartPage() {
  const count = useCartCount()
  const navigate = useNavigate()
  const emptyRef = useRef<HTMLDivElement>(null)
  const emptiedByRemoval = useRef(false)

  // An undo held open for a keyboard user belongs to this page only.
  useEffect(() => dismissCartUndo, [])

  // Only after the last line was removed here, never on a cold load of an empty cart.
  useEffect(() => {
    if (count !== 0 || !emptiedByRemoval.current) return
    emptiedByRemoval.current = false
    const heading = emptyRef.current?.querySelector<HTMLElement>('h1')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
  }, [count])

  if (count === 0) {
    return (
      <Container page className={s.empty}>
        <title>Корзина — Импульс</title>
        <div ref={emptyRef}>
          <EmptyState
            as="h1"
            size="page"
            title="В корзине пока пусто"
            description="Знаете, что ищете, — загляните в каталог. Не уверены — подбор задаст пару вопросов и предложит не больше трёх вариантов."
            action={
              <div className={s.actions}>
                <ButtonLink to={routes.catalog()}>В каталог</ButtonLink>
                <ButtonLink to={routes.finder()} variant="secondary">
                  Подобрать технику
                </ButtonLink>
              </div>
            }
          />
        </div>
      </Container>
    )
  }

  return (
    <>
      <title>Корзина — Импульс</title>
      <CartCheckout
        onPlaced={(order) => navigate(routes.orderSuccess(), { replace: true, state: order })}
        onEmptied={() => {
          emptiedByRemoval.current = true
        }}
      />
    </>
  )
}
