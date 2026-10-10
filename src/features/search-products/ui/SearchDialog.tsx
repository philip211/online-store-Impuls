import { keepPreviousData, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'

import {
  getImage,
  PriceTag,
  ProductImage,
  STOP_WORDS,
  productQueries,
  tokenize,
  type Product,
} from '@/entities/product'
import { routes, type HelpTopicId } from '@/shared/config'
import { ITEM_FORMS, pluralize, splitMatch, useDebouncedValue, useHotkey } from '@/shared/lib'
import {
  ArrowRightIcon,
  BagIcon,
  CardIcon,
  ClockIcon,
  CloseIcon,
  CornerDownLeftIcon,
  Dialog,
  Kbd,
  ReturnIcon,
  SearchIcon,
  ShieldIcon,
  Spinner,
  TruckIcon,
  text,
} from '@/shared/ui'

import { matchHelpTopics } from '../model/help-topics'
import { useSearchStore } from '../model/search-store'
import s from './search.module.css'

/** Starting points for an empty field: a product, a use case, a gift, a budget. */
const POPULAR_QUERIES = ['наушники', 'для бега', 'в подарок', 'до 10 000 ₽', 'колонка']

const HELP_ICONS: Partial<Record<HelpTopicId, ComponentType<{ size?: number }>>> = {
  delivery: TruckIcon,
  returns: ReturnIcon,
  warranty: ShieldIcon,
  payment: CardIcon,
  'order-status': BagIcon,
}

/** Mount once near the app root. Opens via the store, Ctrl/⌘+K or "/". */
export function SearchDialog() {
  const open = useSearchStore((st) => st.open)
  const session = useSearchStore((st) => st.session)
  const setOpen = useSearchStore((st) => st.setOpen)

  useHotkey([{ key: 'k', mod: true }, { key: '/' }], () => setOpen(!useSearchStore.getState().open))

  return (
    <Dialog open={open} onClose={() => setOpen(false)} variant="palette" label="Поиск по магазину">
      {open && <SearchPanel key={session} onClose={() => setOpen(false)} />}
    </Dialog>
  )
}

type Option = {
  id: string
  /** Heading shown above the first option of a group. */
  group?: string
  /** Navigates on choose… */
  to?: string
  /** …or replaces the field text (corrections). */
  apply?: string
  /** Saved to recent searches when chosen. */
  remember?: string
  /** Recent searches can be removed from history. */
  forgettable?: boolean
  render: () => ReactNode
}

/** Row thumbnail; decorative, since the product's name is the row's label. */
function Thumb({ product }: { product: Product }) {
  const image = getImage(product)
  return image && <ProductImage image={image} sizes="48px" ratio="1 / 1" decorative />
}

function Highlight({ text: value, query }: { text: string; query: string }) {
  return splitMatch(value, query).map((part, i) =>
    part.hit ? (
      <mark key={i} className={s.mark}>
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  )
}

const PRICE_WORDS = new Set(['до', 'от', 'дешевле', 'дороже', 'тысяч', 'тыс', 'руб'])

function highlightTerms(query: string): string {
  const words = tokenize(query)
  return words
    .filter((w, i) => !STOP_WORDS.has(w) && !PRICE_WORDS.has(w) && !isPriceNumber(words, i))
    .join(' ')
}

/** "10 000" after "до" is a budget, not a model number to highlight. */
function isPriceNumber(words: string[], i: number): boolean {
  for (let j = i; j >= 0 && /^\d+$/.test(words[j] ?? ''); j--) {
    if (PRICE_WORDS.has(words[j - 1] ?? '')) return true
  }
  return false
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recent = useSearchStore((st) => st.recent)
  const remember = useSearchStore((st) => st.remember)
  const forget = useSearchStore((st) => st.forget)

  const [query, setQuery] = useState('')
  /** null = the default option (first result, skipping the correction row). */
  const [active, setActive] = useState<number | null>(null)
  /** Spoken once after a history entry is removed by keyboard; cleared on the next keystroke. */
  const [removed, setRemoved] = useState('')
  // Slightly longer than the mock latency, so a steady typist triggers one fetch, not a chain
  // of aborted ones.
  const debounced = useDebouncedValue(query.trim(), 200)
  const searching = debounced.length > 0

  const results = useQuery({
    ...productQueries.search(debounced),
    placeholderData: keepPreviousData,
  })
  const popular = useQuery(productQueries.featured())

  // Keep the idle view (dimmed) until the first results land, so the palette never collapses
  // to an empty body between keystrokes.
  const hasResults = results.data !== undefined
  const showSearch = searching && hasResults
  const stale = searching && (!hasResults || results.isPlaceholderData)

  // The query whose products are on screen: help, labels and history follow it, so every group
  // changes in the same frame.
  const [shownQuery, setShownQuery] = useState('')
  if (hasResults && !results.isPlaceholderData && shownQuery !== debounced) setShownQuery(debounced)

  const help = useMemo(
    () => (showSearch ? matchHelpTopics(shownQuery) : []),
    [showSearch, shownQuery],
  )

  const products = useMemo(() => results.data?.products ?? [], [results.data])
  // The correction belongs to the products on screen (shownQuery), placeholder or not, so the
  // "did you mean" row stays put while the next query loads instead of blinking out.
  const correction = (showSearch && results.data?.correctedQuery) || null
  // Highlight what actually matched: the corrected spelling, minus prices and filler words.
  const marked = highlightTerms(correction ?? shownQuery)

  const options = useMemo<Option[]>(() => {
    if (!showSearch) {
      return [
        ...recent.map<Option>((q) => ({
          id: `r-${q}`,
          group: 'Вы искали',
          to: routes.search(q),
          remember: q,
          forgettable: true,
          render: () => (
            <>
              <span className={s.iconCell}>
                <ClockIcon size={18} />
              </span>
              <span className={s.optMain}>
                <span className={s.optName}>{q}</span>
              </span>
            </>
          ),
        })),
        ...(popular.data ?? []).map<Option>((p) => ({
          id: `pop-${p.id}`,
          group: 'Популярные товары',
          to: routes.product(p.slug),
          render: () => (
            <>
              <span className={s.thumb}>
                <Thumb product={p} />
              </span>
              <span className={s.optMain}>
                <span className={s.optName}>{p.name}</span>
                <span className={s.caption}>{p.kind}</span>
              </span>
              <PriceTag product={p} showOld={false} />
            </>
          ),
        })),
      ]
    }

    const fix: Option[] = correction
      ? [
          {
            id: 'fix',
            apply: correction,
            render: () => (
              <>
                <span className={s.iconCell}>
                  <SearchIcon size={18} />
                </span>
                <span className={s.optMain}>
                  <span className={s.fixText}>
                    Возможно, вы имели в виду <strong>«{correction}»</strong>
                  </span>
                </span>
              </>
            ),
          },
        ]
      : []

    const found = products.map<Option>((p) => ({
      id: `p-${p.id}`,
      group: 'Товары',
      to: routes.product(p.slug),
      remember: shownQuery,
      render: () => (
        <>
          <span className={s.thumb}>
            <Thumb product={p} />
          </span>
          <span className={s.optMain}>
            <span className={s.optName}>
              <Highlight text={p.name} query={marked} />
            </span>
            <span className={s.caption}>
              <Highlight text={p.kind} query={marked} />
            </span>
          </span>
          <PriceTag product={p} showOld={false} />
        </>
      ),
    }))

    const answers = help.map<Option>((t) => {
      const Icon = HELP_ICONS[t.id] ?? ArrowRightIcon
      return {
        id: `h-${t.id}`,
        group: 'Помощь',
        to: routes.help(t.id),
        render: () => (
          <>
            <span className={s.iconCell}>
              <Icon size={18} />
            </span>
            <span className={s.optMain}>
              <span className={s.optName}>{t.title}</span>
              <span className={s.caption}>{t.summary}</span>
            </span>
          </>
        ),
      }
    })

    const all: Option[] = products.length
      ? [
          {
            id: 'all',
            to: routes.search(correction ?? shownQuery),
            remember: correction ?? shownQuery,
            render: () => (
              <>
                <span className={s.iconCell}>
                  <SearchIcon size={18} />
                </span>
                <span className={s.optMain}>
                  <span className={s.optName}>Все результаты по «{correction ?? shownQuery}»</span>
                </span>
                <ArrowRightIcon size={18} />
              </>
            ),
          },
        ]
      : []

    return [...fix, ...found, ...answers, ...all]
  }, [showSearch, recent, popular.data, correction, products, shownQuery, marked, help])

  // Consecutive options with the same heading form an ARIA group.
  const sections: { key: string; group?: string; items: { opt: Option; i: number }[] }[] = []
  options.forEach((opt, i) => {
    const last = sections.at(-1)
    if (last && opt.group && last.group === opt.group) last.items.push({ opt, i })
    else sections.push({ key: opt.id, group: opt.group, items: [{ opt, i }] })
  })

  const fallback = options[0]?.id === 'fix' && options.length > 1 ? 1 : 0
  const current = Math.min(active ?? fallback, Math.max(options.length - 1, 0))
  const forgettable = !query && options[current]?.forgettable === true

  const type = (value: string) => {
    setQuery(value)
    setActive(null)
    setRemoved('')
  }

  const choose = (opt: Option | undefined) => {
    if (!opt) return
    if (opt.apply !== undefined) {
      type(opt.apply)
      inputRef.current?.focus()
      return
    }
    if (!opt.to) return
    if (opt.remember) remember(opt.remember)
    onClose()
    navigate(opt.to, { viewTransition: true })
  }

  const move = (delta: number) => {
    if (!options.length) return
    const next = (current + delta + options.length) % options.length
    setActive(next)
    listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if ((e.key === 'Delete' || (e.shiftKey && e.key === 'Backspace')) && !query) {
      // History is only listed for an empty field, so this never fights text editing.
      const opt = options[current]
      if (opt?.forgettable && opt.remember) {
        e.preventDefault()
        forget(opt.remember)
        setRemoved(`«${opt.remember}» удалён из истории`)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Enter before results for this text are on screen still searches the catalogue.
      if (query.trim() && (query.trim() !== shownQuery || !showSearch || !options.length)) {
        choose({ id: 'q', to: routes.search(query), remember: query, render: () => null })
      } else choose(options[current])
    }
  }

  const settled =
    searching && !results.isFetching && !results.isPlaceholderData && query.trim() === debounced
  const empty = settled && !products.length && !help.length
  const status = !settled
    ? ''
    : empty
      ? `Ничего не нашли по запросу «${debounced}»`
      : [
          correction && `Показаны результаты по запросу «${correction}»`,
          `${pluralize(products.length, ITEM_FORMS)}`,
          help.length > 0 && `разделов помощи: ${help.length}`,
        ]
          .filter(Boolean)
          .join(', ')

  const chips = (label: string) => (
    <div className={s.chipsBlock}>
      <p className={s.group}>{label}</p>
      <div className={s.chips}>
        {POPULAR_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            className={s.chip}
            onClick={() => {
              type(q)
              inputRef.current?.focus()
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={s.panel}>
      <div className={s.field}>
        <SearchIcon size={20} />
        <input
          ref={inputRef}
          autoFocus
          className={s.input}
          type="search"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={options[current] ? `${listId}-${current}` : undefined}
          aria-describedby={forgettable ? `${listId}-hint` : undefined}
          aria-label="Что ищем?"
          placeholder="Товар, бренд или вопрос"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => type(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {results.isFetching && searching && <Spinner />}
        <button type="button" className={s.close} onClick={onClose} aria-label="Закрыть поиск">
          <span className={s.closeText}>Отмена</span>
          <CloseIcon size={18} className={s.closeIcon} />
        </button>
      </div>

      <p className={text.srOnly} role="status" aria-live="polite">
        {removed || status}
      </p>
      <p id={`${listId}-hint`} className={text.srOnly}>
        Delete — удалить запрос из истории
      </p>

      <div className={clsx(s.scroll, stale && s.stale)} ref={listRef}>
        {!showSearch && chips('Часто ищут')}

        {empty ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>Ничего не нашли по «{debounced}»</p>
            <p className={clsx(text.muted, text.small)}>
              Попробуйте другое слово, бренд или цену — например, «до 15 000».
            </p>
            {chips('Можно начать с этого')}
          </div>
        ) : (
          <div id={listId} role="listbox" aria-label="Подсказки поиска">
            {sections.map((section) => {
              const items = section.items.map(({ opt, i }) => (
                <div
                  key={opt.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  data-index={i}
                  className={clsx(s.opt, i === current && s.optActive, opt.apply && s.optFix)}
                  onPointerMove={() => i !== current && setActive(i)}
                  onClick={() => choose(opt)}
                >
                  {opt.render()}
                  {opt.forgettable && opt.remember && (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className={s.forget}
                      title="Удалить из истории"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (opt.remember) forget(opt.remember)
                        inputRef.current?.focus()
                      }}
                    >
                      <CloseIcon size={16} />
                    </button>
                  )}
                  {i === current && (
                    <span className={s.enter} aria-hidden="true">
                      <CornerDownLeftIcon size={16} />
                    </span>
                  )}
                </div>
              ))
              if (!section.group) return items
              const headingId = `${listId}-g-${section.key}`
              return (
                <div key={section.key} role="group" aria-labelledby={headingId}>
                  <p id={headingId} className={s.group}>
                    {section.group}
                  </p>
                  {items}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className={s.foot} aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> выбрать
        </span>
        <span>
          <Kbd>Enter</Kbd> открыть
        </span>
        {forgettable && (
          <span>
            <Kbd>Del</Kbd> удалить
          </span>
        )}
        <span>
          <Kbd>Esc</Kbd> закрыть
        </span>
      </div>
    </div>
  )
}
