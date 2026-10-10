import type { UseFormReturn } from 'react-hook-form'

import type { CheckoutValues } from './schema'

type TextField = 'name' | 'phone' | 'address' | 'addressExtra' | 'giftMessage'

/** A field earns the success mark once it was visited, passes the schema and is not empty. */
export function fieldOk(form: UseFormReturn<CheckoutValues>, name: TextField): boolean {
  const { isTouched, invalid } = form.getFieldState(name, form.formState)
  return isTouched && !invalid && form.getValues(name).trim() !== ''
}
