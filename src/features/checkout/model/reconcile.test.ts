import type { CartLine } from '@/entities/cart'
import { ApiError } from '@/shared/api'

import { reconcileCart } from './reconcile'

const line = (productId: number, colorName: string, qty: number, price = 1000): CartLine => ({
  key: `${productId}|${colorName}|Базовый`,
  productId,
  slug: `p${productId}`,
  name: `Товар ${productId}`,
  kind: 'Наушники',
  price,
  colorName,
  colorHex: '#000000',
  option: 'Базовый',
  qty,
})

const problem = (code: string, body: Record<string, unknown>) =>
  new ApiError(409, code, 'detail', { code, ...body })

describe('reconcileCart', () => {
  const cart = [line(1, 'Чёрный', 2, 1000), line(1, 'Белый', 2, 1000), line(2, 'Чёрный', 1, 500)]

  it('takes the current prices', () => {
    const { lines, message } = reconcileCart(
      cart,
      problem('PRICE_CHANGED', {
        lines: [
          { productId: 1, colorName: 'Белый', option: 'Базовый', price: 1200 },
          { productId: 2, colorName: 'Чёрный', option: 'Базовый', price: 500 },
        ],
      }),
    )
    expect(lines.map((l) => l.price)).toEqual([1000, 1200, 500])
    expect(message).toMatch(/Цены изменились/)
  })

  it('cuts a product down to what is left, colour by colour', () => {
    const { lines, message } = reconcileCart(
      cart,
      problem('OUT_OF_STOCK', { productId: 1, available: 3 }),
    )
    expect(lines.map((l) => [l.colorName, l.qty])).toEqual([
      ['Чёрный', 2],
      ['Белый', 1],
      ['Чёрный', 1],
    ])
    expect(message).toMatch(/оставили сколько есть/)
  })

  it('removes a sold-out product', () => {
    const { lines, message } = reconcileCart(
      cart,
      problem('OUT_OF_STOCK', { productId: 1, available: 0 }),
    )
    expect(lines.map((l) => l.productId)).toEqual([2])
    expect(message).toMatch(/закончился/)
  })

  it('removes products that left the catalogue', () => {
    const { lines, message } = reconcileCart(
      cart,
      problem('PRODUCT_UNAVAILABLE', { productIds: [2] }),
    )
    expect(lines).toHaveLength(2)
    expect(message).toBe('«Товар 2» больше не продаётся — убрали из корзины.')
  })

  it('leaves the cart alone for other errors', () => {
    expect(reconcileCart(cart, new TypeError('offline'))).toEqual({ lines: cart, message: null })
    expect(reconcileCart(cart, problem('VALIDATION_FAILED', {}))).toEqual({
      lines: cart,
      message: null,
    })
  })
})
