import { HELP_TOPICS } from '@/shared/config'

import { filterTopics } from './filter-topics'

const ids = (q: string) => filterTopics(q).map((t) => t.id)

describe('filterTopics', () => {
  it('returns every topic for an empty query', () => {
    expect(ids('  ')).toHaveLength(HELP_TOPICS.length)
  })

  it('matches keywords, case-insensitively', () => {
    expect(ids('ВЕРНУТЬ')).toEqual(['returns'])
    expect(ids('ИНН')).toEqual(['seller'])
  })

  it('tolerates Russian word endings', () => {
    expect(ids('курьером')).toEqual(['delivery'])
    expect(ids('гарантии')).toEqual(['warranty'])
  })

  it('narrows to topics matching every word, loosening only when none do', () => {
    expect(ids('пункт самовывоз')).toEqual(['delivery'])
    const loose = ids('гарантия курьер')
    expect(loose.length).toBeGreaterThan(0)
    expect(loose.every((id) => id === 'warranty' || id === 'delivery')).toBe(true)
  })

  it('falls back to typo and keyboard-layout tolerance when nothing matches strictly', () => {
    expect(ids('возрат')).toContain('returns')
    expect(ids('djpdhfn')).toContain('returns')
  })

  it('puts title matches first', () => {
    expect(ids('заказ')[0]).toBe('order-status')
  })
})
