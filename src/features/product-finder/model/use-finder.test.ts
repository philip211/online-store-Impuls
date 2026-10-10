import { describe, expect, it } from 'vitest'

import { catalogSearch } from './use-finder'

const pick = (price: number, category = 'desk') => ({ product: { category, price } })

describe('catalogSearch', () => {
  it('keeps the declared budget when every pick fits it', () => {
    expect(catalogSearch({ use: 'music', budget: '10', pref: 'sound' }, [pick(9_990)])).toBe(
      '?cat=desk&max=10000',
    )
  })

  it('raises the cap to the next step that lists an over-budget pick', () => {
    expect(catalogSearch({ use: 'reading', budget: '10', pref: 'sound' }, [pick(17_990)])).toBe(
      '?cat=desk&max=20000',
    )
  })

  it('drops the cap when no standard step fits the dearest pick', () => {
    expect(catalogSearch({ use: 'music', budget: '40', pref: 'sound' }, [pick(55_000)])).toBe(
      '?cat=desk',
    )
  })

  it('adds no cap for "any" budget or without picks', () => {
    expect(catalogSearch({ use: 'music', budget: 'any', pref: 'sound' }, [pick(55_000)])).toBe(
      '?cat=desk',
    )
    expect(catalogSearch({ use: null, budget: null, pref: null }, null)).toBe('')
  })
})
