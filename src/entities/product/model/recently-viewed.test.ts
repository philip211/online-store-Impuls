import { migrateRecent } from './recently-viewed'

describe('migrateRecent', () => {
  it('drops ids saved against the old catalogue', () => {
    expect(migrateRecent({ ids: [1, 2] }, 1)).toEqual({ ids: [] })
  })

  it('keeps current ids, deduplicated and capped', () => {
    const ids = [3, 3, 0, ...Array.from({ length: 12 }, (_, i) => i + 10)]
    expect(migrateRecent({ ids }, 2).ids).toEqual([3, 10, 11, 12, 13, 14, 15, 16])
  })
})
