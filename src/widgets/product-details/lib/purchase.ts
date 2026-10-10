import { COURIER_PRICE, FREE_SHIPPING_FROM } from '@/shared/config'

/** Courier cost for a single item at this price (free above the threshold). */
export const courierCost = (price: number) => (price >= FREE_SHIPPING_FROM ? 0 : COURIER_PRICE)

/** What the buyer actually pays with courier delivery — shown next to the buy button. */
export const totalWithDelivery = (price: number) => price + courierCost(price)
