import { useId } from 'react'
import { useWatch } from 'react-hook-form'

import { plural } from '@/shared/lib'
import { Checkbox, text } from '@/shared/ui'

import { GIFT_MESSAGE_MAX } from '../model/schema'
import type { CheckoutController } from '../model/use-checkout'
import s from './checkout.module.css'

const CHAR_FORMS = ['символ', 'символа', 'символов'] as const
/** Start announcing the remaining length only when it matters. */
const ANNOUNCE_FROM = 20

export function GiftOptions({ form }: { form: CheckoutController['form'] }) {
  const { register, control, formState } = form
  const [gift, message = ''] = useWatch({ control, name: ['gift', 'giftMessage'] })
  const id = useId()
  const error = formState.errors.giftMessage?.message
  const left = GIFT_MESSAGE_MAX - message.length

  return (
    <fieldset className={s.group}>
      <legend className={s.legend}>Подарок</legend>
      <Checkbox label="Подарочная упаковка — бесплатно" {...register('gift')} />
      {gift && (
        <div className={`${s.stack} ${s.reveal}`}>
          <div className={`${s.field} ${error ? s.bad : ''}`}>
            <label htmlFor={`${id}-msg`}>
              Текст открытки<span className={s.optional}> — необязательно</span>
            </label>
            <textarea
              id={`${id}-msg`}
              rows={3}
              maxLength={GIFT_MESSAGE_MAX}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-count${error ? ` ${id}-err` : ''}`}
              {...register('giftMessage')}
            />
            {error && (
              <span id={`${id}-err`} className={s.error}>
                {error}
              </span>
            )}
            <span id={`${id}-count`} className={s.counter}>
              <span aria-hidden="true">
                {message.length} / {GIFT_MESSAGE_MAX}
              </span>
              <span className={text.srOnly}>До {GIFT_MESSAGE_MAX} символов</span>
            </span>
            <span className={text.srOnly} aria-live="polite">
              {left <= ANNOUNCE_FROM ? `Осталось ${left} ${plural(left, CHAR_FORMS)}` : ''}
            </span>
          </div>
          <Checkbox
            label="Не вкладывать чек — электронный придёт по СМС"
            {...register('noReceipt')}
          />
        </div>
      )}
    </fieldset>
  )
}
