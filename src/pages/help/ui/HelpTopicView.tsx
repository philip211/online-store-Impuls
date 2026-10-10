import type { ComponentType } from 'react'
import { Link } from 'react-router'

import { HELP_TOPICS, routes, type HelpTopicId } from '@/shared/config'
import { ChevronLeftIcon, Container } from '@/shared/ui'

import { ContactCard } from './ContactCard'
import s from './help.module.css'
import { ContactsTopic } from './topics/ContactsTopic'
import { DeliveryTopic } from './topics/DeliveryTopic'
import { OrderStatusTopic } from './topics/OrderStatusTopic'
import { PaymentTopic } from './topics/PaymentTopic'
import { ReturnsTopic } from './topics/ReturnsTopic'
import { SellerTopic } from './topics/SellerTopic'
import { WarrantyTopic } from './topics/WarrantyTopic'

const CONTENT: Record<HelpTopicId, ComponentType> = {
  delivery: DeliveryTopic,
  returns: ReturnsTopic,
  warranty: WarrantyTopic,
  payment: PaymentTopic,
  'order-status': OrderStatusTopic,
  contacts: ContactsTopic,
  seller: SellerTopic,
}

export function HelpTopicView({ id }: { id: HelpTopicId }) {
  const topic = HELP_TOPICS.find((t) => t.id === id) ?? HELP_TOPICS[0]
  const Content = CONTENT[id]

  return (
    <Container page className={s.page}>
      <title>{`${topic.title} — помощь Импульса`}</title>
      <meta name="description" content={topic.summary} />

      <nav aria-label="Хлебные крошки" className={s.crumbs}>
        <ol className={s.trail}>
          <li>
            <Link to={routes.help()} viewTransition className={s.back}>
              <ChevronLeftIcon size={20} />
              Помощь
            </Link>
          </li>
          <li className={s.trailCurrent} aria-current="page">
            {topic.title}
          </li>
        </ol>
      </nav>

      <div className={s.layout}>
        <nav aria-label="Темы помощи" className={s.side}>
          <ul>
            {HELP_TOPICS.map((t) => (
              <li key={t.id}>
                <Link
                  to={routes.help(t.id)}
                  viewTransition
                  aria-current={t.id === id ? 'page' : undefined}
                >
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className={s.article} aria-labelledby="help-title">
          <header className={s.articleHead}>
            <h1 id="help-title" className={s.topicTitle}>
              {topic.title}
            </h1>
            <p className={s.lead}>{topic.summary}</p>
          </header>
          <Content />
          {id !== 'contacts' && <ContactCard title="Не нашли ответ?" className={s.articleCard} />}
        </article>
      </div>
    </Container>
  )
}
