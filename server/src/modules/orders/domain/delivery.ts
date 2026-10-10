import type { ShippingMethod } from '../../../../generated/prisma/client'

/** Days to add, by method: [earliest, latest]. Orders after the cutoff ship a day later. */
const WINDOW: Record<ShippingMethod, [number, number]> = {
  courier: [1, 2],
  pickup: [2, 3],
}
export const CUTOFF_HOUR = 16

const DAY_MS = 86_400_000

/** Hour of day (0–23) at `now` in the shop's time zone, whatever the server's zone is. */
export function hourIn(timeZone: string, now: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone,
  }).format(now)
  return Number(hour)
}

/**
 * Promised delivery window, fixed when the order is accepted. Mirrors the storefront estimate
 * so the date the shopper saw at checkout is the date we commit to.
 */
export function estimateDelivery(method: ShippingMethod, timeZone: string, now = new Date()) {
  const [min, max] = WINDOW[method]
  const shift = hourIn(timeZone, now) >= CUTOFF_HOUR ? 1 : 0
  return {
    from: new Date(now.getTime() + (min + shift) * DAY_MS),
    to: new Date(now.getTime() + (max + shift) * DAY_MS),
  }
}
