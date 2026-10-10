import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'

import { fetchOrder, isPlacedOrder, takeStashedOrder, type PlacedOrder } from '@/features/checkout'
import { useSessionStatus } from '@/entities/session'
import { routes, SUPPORT } from '@/shared/config'
import { formatPrice } from '@/shared/lib'
import { ButtonLink, CheckIcon, Container, text } from '@/shared/ui'

import { deliveryWindow, nextSteps, orderSteps } from '../lib/order-progress'
import s from './order-success.module.css'

/** A just-placed order is on the first status. */
const CURRENT_STEP = 0

/** Card orders come back from the payment page: ask the API whether the payment went through. */
function usePaymentLabel(order: PlacedOrder) {
  const card = order.payment === 'card'
  const { data } = useQuery({
    queryKey: ['order', order.id],
    queryFn: () => fetchOrder(order.id, order.accessKey ?? ''),
    enabled: card && Boolean(order.accessKey),
    // The provider may confirm a few seconds after the redirect.
    // About a minute of polling; after that the shopper sees the pay link and can reload.
    refetchInterval: (q) =>
      q.state.data?.status === 'PENDING_PAYMENT' && q.state.dataUpdateCount < 20 ? 3000 : false,
  })
  if (!card) return { label: 'При получении', payUrl: null }
  if (!data) return { label: 'Картой онлайн', payUrl: null }
  if (data.status === 'PENDING_PAYMENT')
    return { label: 'Ждём оплату', payUrl: data.paymentInfo?.confirmationUrl ?? null }
  if (data.status === 'CANCELLED') return { label: 'Не оплачен, заказ отменён', payUrl: null }
  return { label: 'Оплачено картой', payUrl: null }
}

export function OrderSuccessPage() {
  const { state } = useLocation()
  const [params] = useSearchParams()
  const number = params.get('order')
  // From checkout via history state; back from the payment page via ?order= and the stash.
  const order = isPlacedOrder(state) ? state : number ? takeStashedOrder(number) : null
  if (order) return <OrderDone order={order} />
  // Back from paying in another tab or a private window: no details here, but the number is.
  if (number && /^IM-d{6}$/.test(number)) return <OrderReceived number={number} />
  return <Navigate to={routes.home()} replace />
}

function OrderReceived({ number }: { number: string }) {
  const signedIn = useSessionStatus() === 'user'
  return (
    <Container className={s.done}>
      <title>Заказ оформлен — Импульс</title>
      <header className={s.head}>
        <div className={s.tick}>
          <CheckIcon size={26} strokeWidth={2} />
        </div>
        <p className={text.mono}>Заказ № {number}</p>
        <h1 className={s.title}>Заказ оформлен</h1>
        <p className={text.muted}>
          Результат оплаты пришлём в СМС и на почту. Статус всегда можно проверить по номеру заказа
          и телефону.
        </p>
      </header>
      <div className={s.actions}>
        <ButtonLink to={signedIn ? routes.accountOrder(number) : routes.help('order-status')}>
          {signedIn ? 'Открыть заказ' : 'Проверить статус'}
        </ButtonLink>
        <ButtonLink to={routes.catalog()} variant="secondary">
          Вернуться в каталог
        </ButtonLink>
      </div>
    </Container>
  )
}

function OrderDone({ order }: { order: PlacedOrder }) {
  const payment = usePaymentLabel(order)
  const steps = orderSteps(order)
  const pickup = order.shipping === 'pickup'

  return (
    <Container className={s.done}>
      <title>Заказ принят — Импульс</title>

      <header className={s.head}>
        <div className={s.tick}>
          <CheckIcon size={26} strokeWidth={2} />
        </div>
        <p className={text.mono}>Заказ № {order.id}</p>
        <h1 className={s.title}>Спасибо, {order.name}! Заказ принят</h1>
        <dl className={s.facts}>
          <div>
            <dt>{pickup ? 'В пункте выдачи' : 'Доставка'}</dt>
            <dd>{deliveryWindow(order)}</dd>
          </div>
          <div>
            <dt>Сумма</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
          <div>
            <dt>Оплата</dt>
            <dd>
              {payment.label}
              {payment.payUrl && (
                <>
                  {' · '}
                  <a href={payment.payUrl}>Оплатить</a>
                </>
              )}
            </dd>
          </div>
        </dl>
      </header>

      <section className={s.block} aria-labelledby="order-status">
        <h2 id="order-status" className={s.blockTitle}>
          Статус
        </h2>
        <ol className={s.steps}>
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={clsx(s.step, i <= CURRENT_STEP && s.stepDone)}
              aria-current={i === CURRENT_STEP ? 'step' : undefined}
            >
              <span className={s.dot} aria-hidden="true">
                {i <= CURRENT_STEP && <CheckIcon size={14} strokeWidth={2.4} />}
              </span>
              <span className={s.stepTitle}>
                {step.title}
                {i === CURRENT_STEP && <span className={text.srOnly}> — текущий этап</span>}
              </span>
              <span className={s.stepNote}>{step.note}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={s.block} aria-labelledby="order-next">
        <h2 id="order-next" className={s.blockTitle}>
          Что дальше
        </h2>
        <ol className={s.next}>
          {nextSteps(order).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className={s.block} aria-labelledby="order-help">
        <h2 id="order-help" className={s.blockTitle}>
          Если есть вопросы
        </h2>
        <ul className={s.contacts}>
          <li>
            <a href={SUPPORT.phoneHref}>{SUPPORT.phone}</a>
            <span className={text.muted}>{SUPPORT.hours}</span>
          </li>
          <li>
            <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
            <span className={text.muted}>Назовите номер заказа — так ответим быстрее</span>
          </li>
          <li>
            <a href={SUPPORT.telegram} target="_blank" rel="noreferrer">
              Telegram
            </a>
            <span className={text.muted}>Чат с поддержкой</span>
          </li>
        </ul>
        <Link to={routes.help('order-status')} className={s.more}>
          Как отследить и изменить заказ
        </Link>
      </section>

      <div className={s.actions}>
        <ButtonLink to={routes.catalog()} variant="secondary">
          Вернуться в каталог
        </ButtonLink>
      </div>
    </Container>
  )
}
