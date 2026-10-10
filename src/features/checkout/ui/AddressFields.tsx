import { useState } from 'react'
import { flushSync } from 'react-dom'

import { PlusIcon } from '@/shared/ui'

import { fieldOk } from '../model/field-ok'
import type { ShippingMethod } from '../model/schema'
import type { CheckoutController } from '../model/use-checkout'
import s from './checkout.module.css'
import { Field } from './Field'

type AddressFieldsProps = { form: CheckoutController['form']; shipping: ShippingMethod }

/**
 * One address line; the flat/entrance line hides behind a control
 * (Baymard: a visible "address line 2" makes people think it is required).
 */
export function AddressFields({ form, shipping }: AddressFieldsProps) {
  const { register, formState } = form
  const { errors } = formState
  const [extraOpen, setExtraOpen] = useState(() => form.getValues('addressExtra') !== '')
  const courier = shipping === 'courier'

  const openExtra = () => {
    // Render the field synchronously so focus can land in it instead of on <body>.
    flushSync(() => setExtraOpen(true))
    form.setFocus('addressExtra')
  }

  return (
    <div className={s.stack}>
      <Field
        label={courier ? 'Адрес доставки' : 'Город и удобный пункт выдачи'}
        placeholder={courier ? 'Город, улица, дом' : 'Например, Москва, Тверская 1'}
        autoComplete={courier ? 'address-line1' : 'street-address'}
        error={errors.address?.message}
        valid={fieldOk(form, 'address')}
        {...register('address')}
      />
      {courier &&
        (extraOpen ? (
          <Field
            label="Квартира, подъезд, этаж, домофон"
            optional
            autoComplete="address-line2"
            placeholder="кв. 12, подъезд 3, этаж 5"
            maxLength={120}
            error={errors.addressExtra?.message}
            valid={fieldOk(form, 'addressExtra')}
            className={s.reveal}
            {...register('addressExtra')}
          />
        ) : (
          <button type="button" className={s.more} onClick={openExtra}>
            <PlusIcon size={18} />
            Квартира, подъезд, этаж, домофон
          </button>
        ))}
    </div>
  )
}
