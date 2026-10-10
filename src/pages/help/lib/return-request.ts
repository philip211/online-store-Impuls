import { parseOrderNumber } from './order-status'
import { isPhoneComplete } from './phone'

export const RETURN_REASONS = [
  { id: 'none', label: 'Не хочу указывать' },
  { id: 'fit', label: 'Не подошёл' },
  { id: 'changed', label: 'Изменились планы' },
  { id: 'wrong', label: 'Привезли не тот товар' },
  { id: 'defect', label: 'Брак или неисправность' },
] as const

export type ReturnReasonId = (typeof RETURN_REASONS)[number]['id']
/** The phone the order was placed with proves the request comes from the buyer. */
export type ReturnDraft = { order: string; phone: string; reason: ReturnReasonId }
export type ReturnErrors = Partial<Record<keyof ReturnDraft, string>>

export const reasonLabel = (id: ReturnReasonId) =>
  RETURN_REASONS.find((r) => r.id === id)?.label ?? ''

export function validateReturn(draft: ReturnDraft): ReturnErrors {
  const errors: ReturnErrors = {}
  if (!draft.order.trim()) errors.order = 'Укажите номер заказа — он есть в СМС и письме'
  else if (!parseOrderNumber(draft.order)) errors.order = 'Номер выглядит так: IM-123456'
  if (!isPhoneComplete(draft.phone)) errors.phone = 'Нужен телефон, указанный в заказе'
  return errors
}
