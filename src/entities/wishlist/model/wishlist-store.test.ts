import { migrateWishlist, useWishlistStore } from './wishlist-store'

beforeEach(() => useWishlistStore.setState({ ids: [] }))

describe('wishlist store', () => {
  it('toggles and reports the resulting state', () => {
    const { toggle } = useWishlistStore.getState()
    expect(toggle(3)).toBe(true)
    expect(toggle(5)).toBe(true)
    expect(useWishlistStore.getState().ids).toEqual([5, 3])
    expect(toggle(3)).toBe(false)
    expect(useWishlistStore.getState().ids).toEqual([5])
  })
})

describe('migrateWishlist', () => {
  it('drops ids saved against the old catalogue', () => {
    expect(migrateWishlist({ ids: [1, 2] }, 1)).toEqual({ ids: [] })
  })

  it('keeps current ids and filters junk', () => {
    expect(migrateWishlist({ ids: [4, 4, -1, 'x', 2.5, 7] }, 2)).toEqual({ ids: [4, 7] })
    expect(migrateWishlist(null, 2)).toEqual({ ids: [] })
  })
})
