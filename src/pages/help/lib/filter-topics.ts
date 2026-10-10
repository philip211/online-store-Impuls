import { matchHelpTopics } from '@/features/search-products'
import { HELP_TOPICS, type HelpTopic } from '@/shared/config'
import { normalize } from '@/shared/lib'

/** Light stemming for Russian endings: "курьером", "гарантии" still find "курьер", "гарантия". */
const stem = (word: string) => (word.length > 5 ? word.slice(0, -2) : word)

const haystack = (t: HelpTopic) => normalize([t.title, t.summary, ...t.keywords].join(' '))

/**
 * Narrows help topics to those containing every word of the query (in the
 * title, summary or keywords). Topics whose title matches come first.
 *
 * When nothing matches strictly, falls back to the search palette's matcher, so
 * typos ("возрат") and the wrong keyboard layout ("djpdhfn") still find an answer.
 */
export function filterTopics(query: string, topics: readonly HelpTopic[] = HELP_TOPICS) {
  const words = normalize(query).split(/\s+/).filter(Boolean).map(stem)
  if (!words.length) return [...topics]

  const hits = topics.filter((t) => {
    const hay = haystack(t)
    return words.every((w) => hay.includes(w))
  })
  if (!hits.length) {
    return matchHelpTopics(query, HELP_TOPICS.length).filter((t) => topics.includes(t))
  }
  const inTitle = (t: HelpTopic) => words.some((w) => normalize(t.title).includes(w))
  return [...hits.filter(inTitle), ...hits.filter((t) => !inTitle(t))]
}
