import clsx from 'clsx'
import { useId, useState, type FormEvent, type RefObject } from 'react'

import { ArrowRightIcon, Button, ChevronLeftIcon } from '@/shared/ui'

import { STEP_COUNT, STEPS, type FinderKey } from '../model/answers'
import s from './finder.module.css'

type FinderQuestionProps = {
  index: number
  value: string | null
  /** Answers given so far, shown as a quiet reminder of the path. */
  summary: string[]
  headingRef: RefObject<HTMLHeadingElement | null>
  onAnswer: (key: FinderKey, value: string) => void
  onBack: () => void
}

/** One question per screen: radio cards, then an explicit "Далее" so arrow keys never skip ahead. */
export function FinderQuestion({
  index,
  value,
  summary,
  headingRef,
  onAnswer,
  onBack,
}: FinderQuestionProps) {
  const id = useId()
  const step = STEPS[index] ?? STEPS[0]
  const [selected, setSelected] = useState(value)
  const [missing, setMissing] = useState(false)
  const last = index === STEP_COUNT - 1

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) {
      setMissing(true)
      e.currentTarget.querySelector('input')?.focus()
      return
    }
    onAnswer(step.key, selected)
  }

  return (
    <form className={s.screen} onSubmit={onSubmit} noValidate>
      <fieldset className={s.fieldset} aria-describedby={missing ? `${id}-err` : undefined}>
        <legend className={s.legend}>
          <h2 ref={headingRef} tabIndex={-1} className={s.question}>
            {step.title}
          </h2>
          {summary.length > 0 && <span className={s.path}>{summary.join(' · ')}</span>}
        </legend>

        <div className={s.cards}>
          {step.options.map((o) => (
            <label key={o.value} className={clsx(s.card, selected === o.value && s.cardOn)}>
              <input
                type="radio"
                name={step.key}
                value={o.value}
                checked={selected === o.value}
                onChange={() => {
                  setSelected(o.value)
                  setMissing(false)
                }}
              />
              <span className={s.cardText}>
                <span className={s.cardLabel}>{o.label}</span>
                {'hint' in o && <span className={s.cardHint}>{o.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {missing && (
        <p id={`${id}-err`} className={s.error} role="alert">
          Выберите один вариант
        </p>
      )}

      <div className={s.nav}>
        {index > 0 && (
          <Button variant="secondary" onClick={onBack}>
            <ChevronLeftIcon size={18} />
            Назад
          </Button>
        )}
        <Button type="submit">
          {last ? 'Показать подборку' : 'Далее'}
          <ArrowRightIcon size={18} />
        </Button>
      </div>
    </form>
  )
}
