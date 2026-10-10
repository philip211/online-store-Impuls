import type { PlacedOrder } from '@/features/checkout'
import { RETURN_DAYS } from '@/shared/config'
import { formatDateRange } from '@/shared/lib'

export type OrderStep = { title: string; note: string }

/** Promised window as a phrase: "9–10 октября". */
export const deliveryWindow = (order: PlacedOrder) =>
  formatDateRange(new Date(order.deliveryFrom), new Date(order.deliveryTo))

/** The four statuses a shopper will see; a freshly placed order is on the first. */
export function orderSteps(order: PlacedOrder): OrderStep[] {
  const pickup = order.shipping === 'pickup'
  return [
    { title: 'Принят', note: 'Только что' },
    { title: 'Собираем', note: 'После звонка менеджера' },
    { title: 'В пути', note: pickup ? 'Едет в пункт выдачи' : 'Пришлём СМС, когда курьер выедет' },
    { title: pickup ? 'Ждёт в пункте выдачи' : 'Доставлен', note: deliveryWindow(order) },
  ]
}

/** "Что дальше": concrete next steps for this particular order. */
export function nextSteps(order: PlacedOrder): string[] {
  const pickup = order.shipping === 'pickup'
  return [
    `Позвоним на ${order.phone} один раз — подтвердить заказ и ${
      pickup ? 'пункт выдачи' : 'удобное время доставки'
    }.`,
    order.payment === 'card'
      ? 'После звонка пришлём ссылку на оплату — она откроется на защищённой странице банка.'
      : 'Оплатите при получении — картой или наличными. Заранее платить не нужно.',
    pickup
      ? `Когда заказ приедет в пункт выдачи, пришлём СМС с кодом. Ориентир — ${deliveryWindow(order)}.`
      : `Курьер привезёт заказ ${deliveryWindow(order)} в согласованное время.`,
    ...(order.gift ? ['Упакуем заказ в подарочную коробку.'] : []),
    `Если что-то не подойдёт, вернём деньги в течение ${RETURN_DAYS} дней.`,
  ]
}
