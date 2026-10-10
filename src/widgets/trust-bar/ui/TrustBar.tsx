import clsx from 'clsx'

import { COURIER_PRICE, FREE_SHIPPING_FROM, RETURN_DAYS } from '@/shared/config'
import { describeDelivery, formatPrice } from '@/shared/lib'
import { CardIcon, ReturnIcon, Section, ShieldIcon, TruckIcon, text } from '@/shared/ui'

import s from './trust-bar.module.css'

/** Built at render: delivery is stated as a date ("Привезём 9–10 октября"), not a speed. */
function items() {
  return [
    {
      id: 'delivery',
      Icon: TruckIcon,
      title: describeDelivery('courier'),
      body: `Курьером ${formatPrice(COURIER_PRICE)}, бесплатно от ${formatPrice(FREE_SHIPPING_FROM)}. В пункт выдачи — всегда бесплатно.`,
    },
    {
      id: 'returns',
      Icon: ReturnIcon,
      title: `${RETURN_DAYS} дней на возврат`,
      body: 'Не подошло — заберём курьером и вернём деньги на карту.',
    },
    {
      id: 'payment',
      Icon: CardIcon,
      title: 'Оплата как удобно',
      body: 'Картой онлайн, через СБП или при получении.',
    },
    {
      id: 'warranty',
      Icon: ShieldIcon,
      title: 'Гарантия 1 год',
      body: 'Только официальная техника с чеком и гарантийным талоном.',
    },
  ]
}

export function TrustBar() {
  return (
    <Section flush aria-label="Условия покупки">
      <ul className={clsx(s.trust, text.reveal)}>
        {items().map(({ id, Icon, title, body }) => (
          <li key={id}>
            <Icon size={28} />
            <b>{title}</b>
            <span>{body}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
