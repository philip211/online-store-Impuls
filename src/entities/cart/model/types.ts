/**
 * A cart line keeps a snapshot of what the shopper picked, so the cart renders
 * without refetching and survives catalogue changes (as a real order would).
 */
export type CartLine = {
  key: string
  productId: number
  slug: string
  name: string
  kind: string
  /**
   * Photo id (`<slug>/<n>`) of the shot matching the chosen colour. The thumbnail itself is
   * resolved from the catalogue; without an id the photo for `colorName` is used.
   */
  image?: string
  price: number
  colorName: string
  colorHex: string
  option: string
  qty: number
}

export type CartLineInput = Omit<CartLine, 'key' | 'qty'>
