import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { DEFAULT_FILTERS, productQueries } from '@/entities/product'

import {
  answer,
  BUDGETS,
  isComplete,
  parseAnswers,
  resolveStep,
  stepBack,
  type FinderAnswers,
  type FinderKey,
} from './answers'
import { recommend } from './score'

/** URL is the source of truth: a finished quiz is a shareable link to its results. */
export function useFinder() {
  const [params, setParams] = useSearchParams()
  const answers = useMemo(() => parseAnswers(params), [params])
  const step = resolveStep(params)

  // Each screen is a history entry, so the browser's Back works like ours.
  const choose = useCallback(
    (key: FinderKey, value: string) => setParams((prev) => answer(prev, key, value)),
    [setParams],
  )
  const back = useCallback(
    () => setParams((prev) => stepBack(prev, resolveStep(prev))),
    [setParams],
  )
  const restart = useCallback(() => setParams(new URLSearchParams()), [setParams])

  return { answers, step, choose, back, restart }
}

/** Loads the catalogue as soon as the quiz opens so results appear without a wait. */
export function useFinderPicks(answers: FinderAnswers) {
  const query = useQuery(productQueries.list(DEFAULT_FILTERS))
  const picks = useMemo(
    () => (query.data && isComplete(answers) ? recommend(query.data, answers) : null),
    [query.data, answers],
  )
  return { picks, isError: query.isError, refetch: query.refetch }
}

type PickLike = { product: { category: string; price: number } }

/**
 * Catalogue link narrowed to the top pick's section and a price cap. The cap is the declared
 * budget unless a pick is dearer; then it is the next standard step that still lists every pick,
 * so the link never opens an empty catalogue under the recommendation.
 */
export function catalogSearch(answers: FinderAnswers, picks: readonly PickLike[] | null) {
  const p = new URLSearchParams()
  const category = picks?.[0]?.product.category
  if (category) p.set('cat', category)
  const budgetMax = BUDGETS.find((b) => b.value === answers.budget)?.max ?? null
  const need = picks?.length ? Math.max(...picks.map((x) => x.product.price)) : 0
  const max =
    budgetMax !== null && need <= budgetMax
      ? budgetMax
      : BUDGETS.find((b) => b.max !== null && b.max >= need && budgetMax !== null)?.max
  if (max) p.set('max', String(max))
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}
