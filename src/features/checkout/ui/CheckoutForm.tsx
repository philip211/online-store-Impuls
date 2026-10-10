import { Controller } from 'react-hook-form'

import { describeDelivery, formatPhone, formatPrice } from '@/shared/lib'
import { OptionCard, OptionGroup, text } from '@/shared/ui'

import { fieldOk } from '../model/field-ok'
import { shippingCost } from '../model/pricing'
import { CHECKOUT_FORM_ID, type CheckoutController } from '../model/use-checkout'
import { AddressFields } from './AddressFields'
import s from './checkout.module.css'
import { Field } from './Field'
import { GiftOptions } from './GiftOptions'
import { OptionText } from './OptionText'
import { PaymentOptions } from './PaymentOptions'

type CheckoutFormProps = { checkout: CheckoutController; subtotal: number }

const priceLabel = (cost: number) => (cost ? formatPrice(cost) : 'Бесплатно')

export function CheckoutForm({ checkout, subtotal }: CheckoutFormProps) {
  const { form, submit, shipping } = checkout
  const { register, control, formState } = form
  const { errors } = formState

  return (
    <form id={CHECKOUT_FORM_ID} className={s.form} onSubmit={submit} noValidate>
      <div>
        <h2 className={s.formTitle}>Куда и кому везти</h2>
        <p className={text.muted}>Регистрация не нужна — хватит имени и телефона.</p>
      </div>

      <div className={s.fieldsTwo}>
        <Field
          label="Имя"
          autoComplete="name"
          error={errors.name?.message}
          valid={fieldOk(form, 'name')}
          {...register('name')}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field
              label="Телефон"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 900 000-00-00"
              hint="Формат: +7 900 000-00-00. Позвоним один раз — чтобы согласовать время доставки"
              error={fieldState.error?.message}
              valid={fieldOk(form, 'phone')}
              {...field}
              onChange={(e) => field.onChange(formatPhone(e.target.value))}
            />
          )}
        />
      </div>

      <OptionGroup legend="Доставка">
        <OptionCard
          label={<OptionText title="Курьером" sub={describeDelivery('courier')} />}
          meta={priceLabel(shippingCost('courier', subtotal))}
          value="courier"
          checked={shipping === 'courier'}
          {...register('shipping')}
        />
        <OptionCard
          label={<OptionText title="В пункт выдачи" sub={describeDelivery('pickup')} />}
          meta={priceLabel(shippingCost('pickup', subtotal))}
          value="pickup"
          checked={shipping === 'pickup'}
          {...register('shipping')}
        />
      </OptionGroup>

      <AddressFields form={form} shipping={shipping} />
      <GiftOptions form={form} />
      <PaymentOptions form={form} />
    </form>
  )
}
