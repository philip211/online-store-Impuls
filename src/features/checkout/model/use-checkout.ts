import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { useCartLines, useCartStore, useCartSubtotal } from '@/entities/cart'
import { useSessionStore } from '@/entities/session'
import { formatPhone } from '@/shared/lib'

import { checkoutError, placeOrder, stashPlacedOrder, type PlacedOrder } from '../api/order-api'
import { clearDraft, loadDraft, saveDraft } from './draft'
import { reconcileCart } from './reconcile'
import { orderTotals } from './pricing'
import { CHECKOUT_DEFAULTS, checkoutSchema, describeInvalid, type CheckoutValues } from './schema'

export const CHECKOUT_FORM_ID = 'order-form'

/** Owns the checkout form, live totals and the order mutation. */
type UseCheckoutOptions = {
  /** Called once the order is accepted; the cart is cleared after it settles (e.g. after navigation). */
  onPlaced: (order: PlacedOrder) => void | Promise<void>
}

export function useCheckout({ onPlaced }: UseCheckoutOptions) {
  const lines = useCartLines()
  const subtotal = useCartSubtotal()
  const clearCart = useCartStore((s) => s.clear)

  const [defaultValues] = useState(() => {
    const draft = loadDraft()
    // A signed-in buyer should not type their name and phone again.
    const user = useSessionStore.getState().user
    return {
      ...draft,
      name: draft.name || user?.name || '',
      phone: draft.phone || (user?.phone ? formatPhone(user.phone) : ''),
    }
  })
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues,
    // Validate when the shopper leaves a field, then live while they fix it (Baymard: inline validation).
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  const values = useWatch({ control: form.control })
  useEffect(() => saveDraft(values), [values])

  const shipping = values.shipping ?? CHECKOUT_DEFAULTS.shipping
  const totals = orderTotals(shipping, subtotal)

  /** Set when a refused checkout changed the cart: the shopper reviews it and submits again. */
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: placeOrder,
    onMutate: () => setCartNotice(null),
    onError: (error) => {
      const { lines: next, message } = reconcileCart(useCartStore.getState().lines, error)
      if (!message) return
      useCartStore.getState().replace(next)
      setCartNotice(message)
    },
    onSuccess: async (order) => {
      // The account's order list and stock levels have changed.
      void queryClient.invalidateQueries({ queryKey: ['me', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      if (order.paymentUrl) {
        // Card: off to the payment page; the success page picks the order up on return.
        stashPlacedOrder(order)
        clearCart()
        clearDraft()
        window.location.assign(order.paymentUrl)
        return
      }
      await onPlaced(order)
      clearCart()
      clearDraft()
    },
  })

  const submit = form.handleSubmit((customer) =>
    mutation.mutate({
      // Hidden options do not travel with the order.
      customer: {
        ...customer,
        addressExtra: customer.shipping === 'courier' ? customer.addressExtra : '',
        giftMessage: customer.gift ? customer.giftMessage : '',
        noReceipt: customer.gift && customer.noReceipt,
      },
      total: totals.total,
      lines: lines.map(({ productId, colorName, option, qty, price }) => ({
        productId,
        colorName,
        option,
        qty,
        price,
      })),
    }),
  )

  const { errors, submitCount } = form.formState
  const invalid = Object.keys(errors)

  return {
    form,
    submit,
    shipping,
    totals,
    pending: mutation.isPending,
    /** Why the last attempt failed, ready to show; null when it did not. */
    failed: mutation.isError ? (cartNotice ?? checkoutError(mutation.error)) : null,
    hasErrors: invalid.length > 0,
    /** Summary-level message, only after a submit attempt — inline errors cover the rest. */
    errorSummary: submitCount > 0 && invalid.length > 0 ? describeInvalid(invalid) : null,
  }
}

export type CheckoutController = ReturnType<typeof useCheckout>
