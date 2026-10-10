import { useState } from 'react'

import { COURIER_PRICE, FREE_SHIPPING_FROM, PICKUP_PRICE } from '@/shared/config'
import { describeDelivery, formatPrice } from '@/shared/lib'

import { Faq } from '../Faq'
import s from '../topic.module.css'

const CUTOFF = 16

export function DeliveryTopic() {
  // Dates are computed once per visit, like on the product page.
  const [now] = useState(() => new Date())
  const late = now.getHours() >= CUTOFF

  return (
    <>
      <section className={s.block}>
        <h2 className={s.h2}>Способы и даты</h2>
        <p className={s.p}>
          Показываем дату, а не «срок»: она считается от текущего времени и учитывает сборку на
          складе.
        </p>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <caption className={s.caption}>Даты для заказа, оформленного сейчас</caption>
            <thead>
              <tr>
                <th scope="col">Способ</th>
                <th scope="col">Когда</th>
                <th scope="col">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  Курьером
                  <span className={s.cellNote}>До двери, с 10:00 до 22:00</span>
                </th>
                <td data-label="Когда">{describeDelivery('courier', now)}</td>
                <td data-numeric data-label="Стоимость">
                  {formatPrice(COURIER_PRICE)}
                  <span className={s.cellNote}>Бесплатно от {formatPrice(FREE_SHIPPING_FROM)}</span>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Пункт выдачи
                  <span className={s.cellNote}>Хранение 7 дней</span>
                </th>
                <td data-label="Когда">{describeDelivery('pickup', now)}</td>
                <td data-numeric data-label="Стоимость">
                  {PICKUP_PRICE ? formatPrice(PICKUP_PRICE) : 'Бесплатно'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={s.note}>
          Заказы, оформленные до {CUTOFF}:00, передаём в доставку в тот же день.
          {late && ' Сейчас позже — поэтому даты в таблице уже сдвинуты на день.'}
        </p>
      </section>

      <section className={s.block}>
        <h2 className={s.h2}>Как проходит доставка</h2>
        <ol className={s.steps}>
          <li>
            <b>Подтверждение.</b> В течение часа после заказа перезвоним и сверим адрес. Ночные
            заказы подтверждаем после 9:00.
          </li>
          <li>
            <b>Сборка.</b> Проверяем комплектность и упаковываем. Номер для отслеживания придёт в
            СМС.
          </li>
          <li>
            <b>Вручение.</b> Курьер позвонит за час. Товар можно осмотреть и включить до оплаты —
            если что-то не так, просто откажитесь, это бесплатно.
          </li>
        </ol>
      </section>

      <section className={s.block}>
        <h2 className={s.h2}>Регионы</h2>
        <p className={s.p}>
          Даты выше — для Москвы и Санкт-Петербурга. В другие города доставка занимает на 1–4 дня
          больше: точную дату покажем при оформлении, когда будет известен адрес. Стоимость та же,
          бесплатная доставка от {formatPrice(FREE_SHIPPING_FROM)} действует по всей России.
        </p>
      </section>

      <Faq
        items={[
          {
            q: 'Можно ли перенести доставку?',
            a: 'Да, до момента передачи курьеру — позвоните или напишите в Telegram. После этого дату можно согласовать с курьером напрямую, он позвонит заранее.',
          },
          {
            q: 'Кто может получить заказ?',
            a: 'Любой человек по адресу. Если заказ оплачен онлайн — назовите курьеру код из СМС. Документы не нужны.',
          },
          {
            q: 'Что будет, если я не успею забрать заказ из пункта выдачи?',
            a: 'Заказ хранится 7 дней, срок можно продлить ещё на 3 дня по телефону. Если не заберёте, вернём деньги за онлайн-оплату полностью.',
          },
          {
            q: 'Доставляете ли крупную технику до квартиры?',
            a: 'Да, подъём на этаж бесплатный. Установку и подключение мы не выполняем.',
          },
        ]}
      />
    </>
  )
}
