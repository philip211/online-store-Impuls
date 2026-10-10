import { z } from 'zod'

import { phoneDigits, plural } from '@/shared/lib'

export const SHIPPING_METHODS = ['courier', 'pickup'] as const
export const PAYMENT_METHODS = ['card', 'cash'] as const

export const PHONE_DIGITS = 11
export const GIFT_MESSAGE_MAX = 140

const DIGIT_FORMS = ['цифры', 'цифр', 'цифр'] as const
const EXTRA_FORMS = ['лишняя цифра', 'лишние цифры', 'лишних цифр'] as const

/**
 * Adaptive phone error (Baymard: 94% of sites repeat one generic message).
 * Says what exactly is wrong instead of restating the format.
 */
export function phoneIssue(value: string): string | null {
  const digits = phoneDigits(value).length
  if (digits === 0) return 'Нужен телефон — позвоним, чтобы согласовать доставку'
  if (digits < PHONE_DIGITS) {
    const left = PHONE_DIGITS - digits
    return `Не хватает ${left} ${plural(left, DIGIT_FORMS)}`
  }
  if (digits > PHONE_DIGITS) {
    const extra = digits - PHONE_DIGITS
    return `В номере ${extra} ${plural(extra, EXTRA_FORMS)}`
  }
  return null
}

export const checkoutSchema = z.object({
  name: z.string().trim().min(1, 'Напишите, как к вам обращаться').max(80, 'Слишком длинное имя'),
  phone: z.string().superRefine((value, ctx) => {
    const message = phoneIssue(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  }),
  address: z.string().trim().min(1, 'Без адреса не довезём').max(240, 'Слишком длинный адрес'),
  /** Optional second address line: flat, entrance, floor, intercom. */
  addressExtra: z.string().trim().max(120, 'Сократите до 120 символов'),
  shipping: z.enum(SHIPPING_METHODS),
  payment: z.enum(PAYMENT_METHODS),
  gift: z.boolean(),
  giftMessage: z
    .string()
    .trim()
    .max(GIFT_MESSAGE_MAX, `Открытка вмещает ${GIFT_MESSAGE_MAX} символов`),
  noReceipt: z.boolean(),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>
export type ShippingMethod = CheckoutValues['shipping']
export type PaymentMethod = CheckoutValues['payment']

export const CHECKOUT_DEFAULTS: CheckoutValues = {
  name: '',
  phone: '',
  address: '',
  addressExtra: '',
  shipping: 'courier',
  payment: 'card',
  gift: false,
  giftMessage: '',
  noReceipt: false,
}

/** Human field names for the summary's error list. */
export const FIELD_LABELS: Record<keyof CheckoutValues, string> = {
  name: 'имя',
  phone: 'телефон',
  address: 'адрес',
  addressExtra: 'квартира и подъезд',
  shipping: 'доставка',
  payment: 'оплата',
  gift: 'подарок',
  giftMessage: 'текст открытки',
  noReceipt: 'чек',
}

const isField = (key: string): key is keyof CheckoutValues => key in FIELD_LABELS

/** "Проверьте имя, телефон и адрес" — names the fields in form order. */
export function describeInvalid(keys: readonly string[]): string {
  const names = (Object.keys(FIELD_LABELS) as (keyof CheckoutValues)[])
    .filter((k) => keys.includes(k))
    .map((k) => FIELD_LABELS[k])
  const unknown = keys.some((k) => !isField(k))
  if (names.length === 0 || unknown) return 'Проверьте поля, отмеченные красным'
  const head = names.slice(0, -1)
  const last = names.at(-1) ?? ''
  return head.length ? `Проверьте ${head.join(', ')} и ${last}` : `Проверьте ${last}`
}
