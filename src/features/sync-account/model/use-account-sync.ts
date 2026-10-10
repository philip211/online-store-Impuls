import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { lineKey, useCartStore, type CartLine } from '@/entities/cart'
import { getImage, type Product } from '@/entities/product'
import { useSessionStatus, useSessionStore, useUser } from '@/entities/session'
import { useWishlistStore } from '@/entities/wishlist'
import { api } from '@/shared/api'

type ServerCartItem = {
  productId: number
  colorName: string
  option: string
  qty: number
  product: Product
}
type ServerCart = { items: ServerCartItem[] }

const PUSH_DELAY_MS = 800
/** Waits between merge attempts while the API is unreachable: 5 s, 15 s, 45 s, then every 2 min. */
const RETRY_MS = [5_000, 15_000, 45_000, 120_000]

/** Local changes made while signing out (clearing the device) must not reach the account. */
const signedIn = () => useSessionStore.getState().status === 'user'

/** A server cart line as the storefront keeps it: a snapshot with the current price. */
function toCartLine(item: ServerCartItem): CartLine {
  const { product } = item
  const color = product.colors.find((c) => c.name === item.colorName) ?? product.colors[0]
  return {
    key: lineKey(item),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    kind: product.kind,
    image: getImage(product, { color: item.colorName })?.id,
    price: product.price,
    colorName: item.colorName,
    colorHex: color.hex,
    option: item.option,
    qty: item.qty,
  }
}

const toInput = (l: Pick<CartLine, 'productId' | 'colorName' | 'option' | 'qty'>) => ({
  productId: l.productId,
  colorName: l.colorName,
  option: l.option,
  qty: l.qty,
})

/**
 * Joins what the guest collected with the account's cart: a line in both keeps the larger
 * quantity, so signing in on the same device twice never doubles it. If the cart changed
 * locally while the request was in flight, the merge runs again with the newer lines.
 */
async function mergeCart() {
  for (let round = 0; round < 3; round++) {
    const local = useCartStore.getState().lines
    const server = await api<ServerCart>('/me/cart')
    const merged = new Map(server.items.map((i) => [lineKey(i), toInput(i)]))
    for (const line of local) {
      const prev = merged.get(line.key)
      merged.set(line.key, toInput({ ...line, qty: Math.max(line.qty, prev?.qty ?? 0) }))
    }
    const saved = await api<ServerCart>('/me/cart', {
      method: 'PUT',
      body: { items: [...merged.values()] },
    })
    if (useCartStore.getState().lines !== local) continue
    useCartStore.getState().replace(saved.items.map(toCartLine))
    return
  }
}

async function mergeWishlist() {
  for (let round = 0; round < 3; round++) {
    const local = useWishlistStore.getState().ids
    const products = await api<Product[]>('/me/wishlist/merge', {
      method: 'POST',
      body: { productIds: local },
    })
    if (useWishlistStore.getState().ids !== local) continue
    useWishlistStore.getState().replace(products.map((p) => p.id))
    return
  }
}

/**
 * Leaving an account, whichever way (the logout button, an expired session, a password
 * change, another person signing in), leaves nothing of it on this device. The account
 * keeps its cart and wishlist on the server, so nothing is lost.
 */
function useSignOutCleanup() {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      useSessionStore.subscribe((state, prev) => {
        if (prev.status !== 'user') return
        if (state.status === 'user' && state.user?.id === prev.user?.id) return
        useCartStore.getState().clear()
        useWishlistStore.getState().replace([])
        queryClient.removeQueries({ queryKey: ['me'] })
        queryClient.removeQueries({ queryKey: ['admin'] })
      }),
    [queryClient],
  )
}

/**
 * While someone is signed in, the cart and the wishlist live on the account too: merged once
 * after sign-in (retried until the API answers), then every change is sent to the server, so
 * another device sees it. Mounted once, in the app shell.
 */
export function useAccountSync() {
  useSignOutCleanup()
  const status = useSessionStatus()
  const userId = useUser()?.id

  useEffect(() => {
    if (status !== 'user' || !userId) return
    let active = true
    let pushTimer: ReturnType<typeof setTimeout> | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe: (() => void)[] = []
    const quiet = () => undefined

    // Plain PUTs replace the account's cart, so they start only after a successful merge;
    // until then a failed merge is retried instead of overwriting the other devices' picks.
    const startPushing = () => {
      unsubscribe.push(
        useCartStore.subscribe((state, prev) => {
          if (state.lines === prev.lines || !signedIn()) return
          clearTimeout(pushTimer)
          pushTimer = setTimeout(() => {
            if (!signedIn()) return
            const items = state.lines.map(toInput)
            void api('/me/cart', { method: 'PUT', body: { items } }).catch(quiet)
          }, PUSH_DELAY_MS)
        }),
        useWishlistStore.subscribe((state, prev) => {
          if (!signedIn()) return
          for (const id of state.ids) {
            if (!prev.ids.includes(id))
              void api(`/me/wishlist/${id}`, { method: 'PUT' }).catch(quiet)
          }
          for (const id of prev.ids) {
            if (!state.ids.includes(id)) {
              void api(`/me/wishlist/${id}`, { method: 'DELETE' }).catch(quiet)
            }
          }
        }),
      )
    }

    const merge = async (attempt: number) => {
      try {
        await Promise.all([mergeWishlist(), mergeCart()])
        if (active) startPushing()
      } catch {
        if (!active) return
        const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]
        retryTimer = setTimeout(() => void merge(attempt + 1), delay)
      }
    }
    void merge(0)

    return () => {
      active = false
      clearTimeout(pushTimer)
      clearTimeout(retryTimer)
      unsubscribe.forEach((off) => off())
    }
  }, [status, userId])
}
