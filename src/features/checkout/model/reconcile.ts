import type { CartLine } from '@/entities/cart'
import { isApiError } from '@/shared/api'

export type Reconciled = {
  lines: CartLine[]
  /** What changed, for the shopper; null when the error says nothing about the cart. */
  message: string | null
}

type PricedLine = { productId: number; colorName: string; option: string; price: number }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const key = (l: Pick<CartLine, 'productId' | 'colorName' | 'option'>) =>
  `${l.productId}|${l.colorName}|${l.option}`

/**
 * Brings the cart in line with the server after a refused checkout, so the next attempt can
 * succeed instead of failing the same way forever:
 * - PRICE_CHANGED: the lines take the current prices;
 * - OUT_OF_STOCK: the product is cut down to what is left (or removed);
 * - PRODUCT_UNAVAILABLE: products that left the catalogue are removed.
 */
export function reconcileCart(lines: CartLine[], error: unknown): Reconciled {
  if (!isApiError(error)) return { lines, message: null }
  const body = error.body

  if (error.code === 'PRICE_CHANGED' && Array.isArray(body.lines)) {
    const prices = new Map(
      (body.lines as unknown[])
        .filter(
          (l): l is PricedLine =>
            isRecord(l) && typeof l.productId === 'number' && typeof l.price === 'number',
        )
        .map((l) => [key(l), l.price]),
    )
    const next = lines.map((l) => {
      const price = prices.get(l.key) ?? prices.get(key(l))
      return price === undefined || price === l.price ? l : { ...l, price }
    })
    return {
      lines: next,
      message: 'Цены изменились — мы обновили корзину. Проверьте итог и подтвердите заказ ещё раз.',
    }
  }

  if (error.code === 'OUT_OF_STOCK' && typeof body.productId === 'number') {
    let left = typeof body.available === 'number' ? Math.max(0, body.available) : 0
    const next: CartLine[] = []
    for (const l of lines) {
      if (l.productId !== body.productId) {
        next.push(l)
        continue
      }
      // Several colours of one product share its stock: fill them in cart order.
      const qty = Math.min(l.qty, left)
      left -= qty
      if (qty > 0) next.push({ ...l, qty })
    }
    const name = lines.find((l) => l.productId === body.productId)?.name ?? 'Товар'
    const kept = next.some((l) => l.productId === body.productId)
    return {
      lines: next,
      message: kept
        ? `«${name}» осталось меньше, чем было в корзине — оставили сколько есть. Проверьте и подтвердите заказ.`
        : `«${name}» закончился — убрали его из корзины.`,
    }
  }

  if (error.code === 'PRODUCT_UNAVAILABLE' && Array.isArray(body.productIds)) {
    const gone = new Set(body.productIds.filter((id): id is number => typeof id === 'number'))
    const names = lines.filter((l) => gone.has(l.productId)).map((l) => `«${l.name}»`)
    return {
      lines: lines.filter((l) => !gone.has(l.productId)),
      message: `${names.join(', ') || 'Часть товаров'} больше не продаётся — убрали из корзины.`,
    }
  }

  return { lines, message: null }
}
