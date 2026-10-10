/** Every email the shop sends, with the data each one needs. */
export type MailMessage =
  | {
      type: 'order.placed'
      to: string
      number: string
      name: string
      total: number
      items: { name: string; qty: number; lineTotal: number }[]
      deliveryFrom: string
      deliveryTo: string
      shipping: 'courier' | 'pickup'
      orderUrl: string
    }
  | { type: 'order.status'; to: string; number: string; status: string; orderUrl: string }
  | { type: 'restock.available'; to: string; productName: string; productUrl: string }
  | { type: 'newsletter.confirm'; to: string; confirmUrl: string; unsubscribeUrl: string }
  | { type: 'return.requested'; to: string; ref: string; number: string }

export type RenderedMail = { to: string; subject: string; text: string; html: string }

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c)

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Moscow',
  })

/** Plain paragraphs in, a minimal accessible HTML letter (and its text twin) out. */
function layout(paragraphs: string[], action?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${esc(p)}</p>`).join('')
  const button = action
    ? `<p style="margin:24px 0"><a href="${esc(action.url)}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${esc(action.label)}</a></p>`
    : ''
  const html = `<!doctype html><html lang="ru"><body style="font:16px/1.5 system-ui,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">${body}${button}<p style="color:#777;font-size:13px">Импульс — магазин электроники</p></body></html>`
  const text = [
    ...paragraphs,
    ...(action ? [`${action.label}: ${action.url}`] : []),
    '—',
    'Импульс',
  ]
  return { html, text: text.join('\n\n') }
}

export function render(m: MailMessage): RenderedMail {
  switch (m.type) {
    case 'order.placed': {
      const lines = m.items.map((i) => `${i.name} × ${i.qty} — ${rub(i.lineTotal)}`)
      const where = m.shipping === 'courier' ? 'Привезём' : 'Заказ будет в пункте выдачи'
      return {
        to: m.to,
        subject: `Заказ ${m.number} принят`,
        ...layout(
          [
            `${m.name}, спасибо за заказ!`,
            ...lines,
            `Итого: ${rub(m.total)}`,
            `${where} ${day(m.deliveryFrom)} – ${day(m.deliveryTo)}. Перед доставкой позвоним.`,
          ],
          { label: 'Статус заказа', url: m.orderUrl },
        ),
      }
    }
    case 'order.status':
      return {
        to: m.to,
        subject: `Заказ ${m.number}: ${m.status.toLowerCase()}`,
        ...layout([`Статус заказа ${m.number}: ${m.status}.`], {
          label: 'Подробнее',
          url: m.orderUrl,
        }),
      }
    case 'restock.available':
      return {
        to: m.to,
        subject: `${m.productName} снова в наличии`,
        ...layout([`${m.productName} снова в продаже. Количество ограничено.`], {
          label: 'Перейти к товару',
          url: m.productUrl,
        }),
      }
    case 'newsletter.confirm':
      return {
        to: m.to,
        subject: 'Подтвердите подписку',
        ...layout(
          [
            'Подтвердите, что хотите получать письма о новинках и скидках — не чаще раза в неделю.',
            `Если вы не подписывались, проигнорируйте письмо или отпишитесь: ${m.unsubscribeUrl}`,
          ],
          { label: 'Подтвердить подписку', url: m.confirmUrl },
        ),
      }
    case 'return.requested':
      return {
        to: m.to,
        subject: `Заявка на возврат ${m.ref}`,
        ...layout([
          `Приняли заявку ${m.ref} на возврат по заказу ${m.number}.`,
          'Менеджер свяжется с вами в течение рабочего дня и подскажет, как передать товар.',
        ]),
      }
  }
}
