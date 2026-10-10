import { SUPPORT } from '@/shared/config'

import s from '../topic.module.css'

// Placeholders: this is a demo store, there is no real legal entity behind it.
const DETAILS = [
  { term: 'Продавец', value: 'ООО «Импульс»' },
  { term: 'ИНН', value: '0000000000' },
  { term: 'КПП', value: '000000000' },
  { term: 'ОГРН', value: '0000000000000' },
  { term: 'Юридический адрес', value: '000000, г. Москва, ул. Примерная, д. 0' },
]

export function SellerTopic() {
  return (
    <>
      <section className={s.block}>
        <p className={s.demo}>
          <b>Демо-данные.</b> Магазин демонстрационный: реквизиты ниже условные и не принадлежат
          реальной компании.
        </p>
        <h2 className={s.h2}>Реквизиты</h2>
        <dl className={s.facts}>
          {DETAILS.map((d) => (
            <div key={d.term}>
              <dt>{d.term}</dt>
              <dd data-numeric>{d.value}</dd>
            </div>
          ))}
          <div>
            <dt>Почта</dt>
            <dd>
              <a href={`mailto:${SUPPORT.email}`} className={s.link}>
                {SUPPORT.email}
              </a>
            </dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>
              <a href={SUPPORT.phoneHref} className={s.link}>
                {SUPPORT.phone}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className={s.block}>
        <h2 className={s.h2}>Претензии и обращения</h2>
        <p className={s.p}>
          Письменную претензию можно отправить на почту или по юридическому адресу. Отвечаем в
          течение 10 дней, обычно — в день получения.
        </p>
      </section>
    </>
  )
}
