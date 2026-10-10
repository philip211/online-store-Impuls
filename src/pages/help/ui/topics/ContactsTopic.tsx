import { routes, SUPPORT } from '@/shared/config'
import { ButtonLink } from '@/shared/ui'

import { ContactCard } from '../ContactCard'
import s from '../topic.module.css'

export function ContactsTopic() {
  return (
    <>
      <ContactCard />

      <section className={s.block}>
        <h2 className={s.h2}>Как быстро ответим</h2>
        <dl className={s.facts}>
          <div>
            <dt>Телефон</dt>
            <dd>Сразу, без голосового меню. Звонок по России бесплатный</dd>
          </div>
          <div>
            <dt>Telegram</dt>
            <dd>Обычно за 5 минут, можно прислать фото или видео</dd>
          </div>
          <div>
            <dt>Почта</dt>
            <dd>В течение 4 часов в рабочее время — для документов и счетов</dd>
          </div>
          <div>
            <dt>Часы работы</dt>
            <dd>{SUPPORT.hours}, включая праздники</dd>
          </div>
        </dl>
      </section>

      <section className={s.block}>
        <h2 className={s.h2}>Подобрать технику с консультантом</h2>
        <p className={s.p}>
          Расскажите, для чего нужна техника и какой бюджет, — консультант сравнит модели и объяснит
          разницу простыми словами. Если подходящей модели у нас нет, так и скажем. Можно начать
          самостоятельно: подбор займёт пару минут.
        </p>
        <div className={s.actions}>
          <ButtonLink to={routes.finder()} variant="secondary">
            Подобрать технику
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
