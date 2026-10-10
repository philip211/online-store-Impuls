import { CURRENCY } from '@/shared/config'

const NBSP = '\u00A0'

/** 32990 → "32 990 ₽" with non-breaking spaces, matching the design. */
export function formatPrice(value: number): string {
  const digits = String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${digits}${NBSP}${CURRENCY}`
}
