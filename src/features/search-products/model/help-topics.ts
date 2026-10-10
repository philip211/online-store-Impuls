import { bestMatch, meaningfulWords, queryWords, tokenize } from '@/entities/product'
import { HELP_TOPICS, type HelpTopic } from '@/shared/config'

const indexed = HELP_TOPICS.map((topic) => ({
  topic,
  fields: [
    { weight: 3, tokens: tokenize(topic.title) },
    { weight: 2, tokens: tokenize(topic.keywords.join(' ')) },
    { weight: 1, tokens: tokenize(topic.summary) },
  ],
}))

/**
 * Service questions ("где мой заказ", "djpdhfn") → help topics, with the same
 * typo and layout tolerance as product search. Unlike products, a topic needs
 * only half of the words: people phrase questions loosely.
 */
export function matchHelpTopics(query: string, limit = 3): HelpTopic[] {
  const words = meaningfulWords(queryWords(query))
  if (!words.length) return []

  return indexed
    .map(({ topic, fields }) => {
      let score = 0
      let hits = 0
      for (const w of words) {
        // Two letters are not a question yet.
        const partial = w.partial && w.typed.length >= 3
        let best = 0
        for (const variant of w.variants) {
          const penalty = variant === w.typed ? 1 : 0.8
          for (const f of fields) {
            const m = bestMatch(variant, f.tokens, partial)
            if (m && m.quality >= 0.5) best = Math.max(best, m.quality * f.weight * penalty)
          }
        }
        if (best > 0) hits += 1
        score += best
      }
      return { topic, score: hits * 2 >= words.length ? score : 0 }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.topic)
}
