import { useId } from 'react'
import { useWatch } from 'react-hook-form'

import { OptionCard } from '@/shared/ui'

import type { CheckoutController } from '../model/use-checkout'
import s from './checkout.module.css'
import { OptionText } from './OptionText'

function LockIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/**
 * Payment sits on its own surface: shoppers judge security by the area around
 * the card choice (Baymard), so the reassurance lives right there.
 */
export function PaymentOptions({ form }: { form: CheckoutController['form'] }) {
  const { register, control } = form
  const payment = useWatch({ control, name: 'payment' })
  const noteId = useId()

  return (
    <fieldset className={s.pay} aria-describedby={noteId}>
      <legend className={s.legend}>Оплата</legend>
      <p id={noteId} className={s.secure}>
        <LockIcon />
        <span>Оплата на защищённой странице банка. Мы не видим и не храним данные карты.</span>
      </p>
      <div className={s.payOptions}>
        <OptionCard
          label={
            <OptionText title="Картой или через СБП" sub="Онлайн, после подтверждения заказа" />
          }
          value="card"
          checked={payment === 'card'}
          {...register('payment')}
        />
        <OptionCard
          label={<OptionText title="При получении" sub="Картой или наличными" />}
          value="cash"
          checked={payment === 'cash'}
          {...register('payment')}
        />
      </div>
    </fieldset>
  )
}
