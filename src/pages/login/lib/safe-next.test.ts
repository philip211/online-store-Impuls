import { safeNext } from './safe-next'

describe('safeNext', () => {
  it('keeps paths of this site', () => {
    expect(safeNext('/account/orders/IM-123456')).toBe('/account/orders/IM-123456')
    expect(safeNext('/admin?status=CONFIRMED')).toBe('/admin?status=CONFIRMED')
  })

  it('refuses anything that could leave the site', () => {
    const backslash = String.raw`/\evil.example`
    for (const bad of ['https://evil.example', '//evil.example', backslash, 'evil', '']) {
      expect(safeNext(bad)).toBe('/account')
    }
    expect(safeNext(null)).toBe('/account')
  })
})
