import { ProductFinder } from '@/features/product-finder'
import { RETURN_DAYS } from '@/shared/config'
import { Container, text } from '@/shared/ui'

import s from './finder-page.module.css'

export function FinderPage() {
  return (
    <Container page className={s.page}>
      <title>Подбор техники — Импульс</title>
      <header className={s.head}>
        <p className={s.kicker}>Подбор за минуту</p>
        <h1 className={text.pageTitle}>Три вопроса&nbsp;— и&nbsp;мы подскажем</h1>
        <p className={s.lead}>
          Расскажите, для чего вещь и сколько готовы потратить. Предложим не больше трёх вариантов и
          объясним, почему каждый подходит. Если не понравится — вернём деньги в течение{' '}
          {RETURN_DAYS} дней.
        </p>
      </header>
      <ProductFinder />
    </Container>
  )
}
