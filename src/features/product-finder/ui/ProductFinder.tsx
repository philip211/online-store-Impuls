import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import { labelOf, STEP_COUNT, STEPS } from '../model/answers'
import { useFinder, useFinderPicks } from '../model/use-finder'
import { FinderQuestion } from './FinderQuestion'
import { FinderResults } from './FinderResults'
import s from './finder.module.css'

export function ProductFinder() {
  const { answers, step, choose, back, restart } = useFinder()
  const { picks, isError, refetch } = useFinderPicks(answers)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prevStep = useRef(step)

  // Move focus to the new question so screen readers and keyboards follow the screen change.
  // Comparing with the previous step (not a first-render flag) survives StrictMode's double
  // mount, so a fresh load never steals focus or scrolls.
  useEffect(() => {
    if (prevStep.current === step) return
    prevStep.current = step
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.closest('section, form')?.scrollIntoView({ block: 'nearest' })
  }, [step])

  const answeredBefore = (limit: number) =>
    STEPS.slice(0, limit).flatMap((st) => {
      const v = answers[st.key]
      return v ? [labelOf(st.key, v)] : []
    })

  return (
    <div className={clsx(s.root, step !== 'results' && s.asking)}>
      {step === 'results' ? (
        <FinderResults
          answers={answers}
          picks={picks}
          isError={isError}
          summary={answeredBefore(STEPS.length)}
          headingRef={headingRef}
          onBack={back}
          onRestart={restart}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {/* Stays mounted across questions so only the question re-enters and the bar fills. */}
          <div className={s.progress}>
            <p className={s.count}>
              Вопрос {step + 1} из {STEP_COUNT}
            </p>
            <ol className={s.bar} aria-hidden="true">
              {STEPS.map((st, i) => (
                <li key={st.key} className={clsx(i <= step && s.barOn)} />
              ))}
            </ol>
          </div>
          <FinderQuestion
            // Remount per question: resets the local choice and replays the entrance.
            key={step}
            index={step}
            value={answers[STEPS[step]?.key ?? 'use']}
            summary={answeredBefore(step)}
            headingRef={headingRef}
            onAnswer={choose}
            onBack={back}
          />
        </>
      )}
    </div>
  )
}
