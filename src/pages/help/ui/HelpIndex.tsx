import { useState } from 'react'
import { Link } from 'react-router'

import { routes } from '@/shared/config'
import { pluralize, splitMatch } from '@/shared/lib'
import { ArrowRightIcon, Container, TextField, text } from '@/shared/ui'

import { filterTopics } from '../lib/filter-topics'
import { ContactCard } from './ContactCard'
import s from './help.module.css'

const TOPIC_FORMS = ['тема', 'темы', 'тем'] as const

function Highlight({ value, query }: { value: string; query: string }) {
  return splitMatch(value, query).map((part, i) =>
    part.hit ? <mark key={i}>{part.text}</mark> : part.text,
  )
}

export function HelpIndex({ unknown }: { unknown?: string }) {
  const [query, setQuery] = useState('')
  const topics = filterTopics(query)
  const searching = query.trim().length > 0

  return (
    <Container page className={s.page}>
      <title>Помощь — Импульс</title>

      <header className={s.indexHead}>
        <h1 className={text.pageTitle}>Помощь</h1>
        <p className={s.lead}>
          Доставка, возврат, гарантия и оплата — коротко и по делу. Если ответа нет, напишите нам:
          ответит человек.
        </p>
        {unknown && (
          <p className={s.note} role="status">
            Раздела «{unknown}» нет. Вот все темы помощи.
          </p>
        )}
      </header>

      <div className={s.indexGrid}>
        <div>
          <search className={s.filter}>
            <TextField
              label="Найти ответ"
              type="search"
              placeholder="Например, вернуть или рассрочка"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </search>
          <p className={s.count} aria-live="polite">
            {searching && `Найдено: ${pluralize(topics.length, TOPIC_FORMS)}`}
          </p>

          {topics.length > 0 ? (
            <ul className={s.rows}>
              {topics.map((t) => (
                <li key={t.id}>
                  <Link to={routes.help(t.id)} viewTransition className={s.row}>
                    <span className={s.rowText}>
                      <span className={s.rowTitle}>
                        <Highlight value={t.title} query={query} />
                      </span>
                      <span className={s.rowSummary}>
                        <Highlight value={t.summary} query={query} />
                      </span>
                    </span>
                    <ArrowRightIcon className={s.rowArrow} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.empty}>
              По запросу «{query.trim()}» готового ответа нет. Напишите консультанту — разберёмся
              вместе.
            </p>
          )}
        </div>

        <ContactCard className={s.indexCard} />
      </div>
    </Container>
  )
}
