import { routes } from '@/shared/config'
import { ArrowRightIcon, ButtonLink, Container, text } from '@/shared/ui'

import s from './finder-band.module.css'

/** Editorial invitation to the product finder: words and one link, no decoration. */
export function FinderBand() {
  return (
    <section className={s.band} aria-labelledby="h-finder">
      <Container className={s.inner}>
        <div className={s.copy}>
          <p className={s.kicker}>Подбор</p>
          <h2 id="h-finder" className={s.title}>
            Не знаете, что выбрать? Три вопроса&nbsp;— и&nbsp;мы подскажем
          </h2>
        </div>
        <div className={s.side}>
          <p className={s.lead}>
            Для чего, какой бюджет и что важнее. В ответ — до трёх вещей из каталога и по строчке о
            том, почему каждая подходит.
          </p>
          <ButtonLink to={routes.finder()} variant="secondary">
            Подобрать за минуту
            <ArrowRightIcon size={18} />
          </ButtonLink>
          <p className={text.mono}>Ответы остаются в ссылке — ей можно поделиться.</p>
        </div>
      </Container>
    </section>
  )
}
