import { randomInt } from 'node:crypto'

/** Six digits: the format order tracking and returns accept (IM-123456). Not sequential, so
 *  numbers do not reveal sales volume or let anyone walk through other orders. */
export const generateOrderNumber = () => `IM-${randomInt(100_000, 1_000_000)}`

/** "IM-123456", "im 123456", "IM123456" or just "123456" → "IM-123456"; anything else → null. */
export function parseOrderNumber(input: string): string | null {
  const match = /^(?:IM-?)?(\d{6})$/i.exec(input.replace(/\s+/g, ''))
  return match ? `IM-${match[1]}` : null
}

/** Return reference: order digits + date, e.g. "RT-3456-0710". A random suffix keeps two
 *  returns for one order on one day apart. */
export function makeReturnRef(orderNumber: string, now = new Date(), suffix = randomInt(10, 100)) {
  const digits = orderNumber.replace(/\D/g, '').slice(-4).padStart(4, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `RT-${digits}-${day}${month}-${suffix}`
}
