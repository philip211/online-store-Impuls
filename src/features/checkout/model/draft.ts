import { z } from 'zod'

import {
  CHECKOUT_DEFAULTS,
  GIFT_MESSAGE_MAX,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  type CheckoutValues,
} from './schema'

const KEY = 'impulse-checkout-draft'

// A draft is half-filled by nature: check its shape, not the business rules.
const draftSchema = z
  .object({
    name: z.string().max(80),
    phone: z.string().max(20),
    address: z.string().max(240),
    addressExtra: z.string().max(120),
    shipping: z.enum(SHIPPING_METHODS),
    payment: z.enum(PAYMENT_METHODS),
    gift: z.boolean(),
    giftMessage: z.string().max(GIFT_MESSAGE_MAX),
    noReceipt: z.boolean(),
  })
  .partial()

/**
 * The checkout form survives reloads and trips back to the catalogue within the
 * tab session. Stored in sessionStorage so personal data does not linger.
 */
export function loadDraft(): CheckoutValues {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return CHECKOUT_DEFAULTS
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    return parsed.success ? { ...CHECKOUT_DEFAULTS, ...parsed.data } : CHECKOUT_DEFAULTS
  } catch {
    return CHECKOUT_DEFAULTS
  }
}

export function saveDraft(values: Partial<CheckoutValues>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values))
  } catch {
    /* storage unavailable — draft is a convenience only */
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
