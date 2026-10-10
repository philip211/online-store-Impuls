import { CARD_MM, formatCm, isPortraitKind, parseDimensions, scaleScene } from './scale'

describe('parseDimensions', () => {
  it('reads two or three sides in millimetres', () => {
    expect(parseDimensions('20 × 17 × 7 см')).toEqual({ sides: [200, 170, 70], round: false })
    expect(parseDimensions('4,4 × 3,8 см')).toEqual({ sides: [44, 38], round: false })
  })
  it('skips prefixes and trailing notes', () => {
    expect(parseDimensions('около 22 × 19 × 7 см')?.sides).toEqual([220, 190, 70])
    expect(parseDimensions('4,0 × 3,4 × 1,07 см (40 мм)')?.sides).toEqual([40, 34, 10.7])
    expect(parseDimensions('кейс 6,1 × 4,5 × 2,2 см')?.sides).toEqual([61, 45, 22])
  })
  it('recognises a diameter', () => {
    expect(parseDimensions('Ø 13,3 × 4,6 см')).toEqual({ sides: [133, 46], round: true })
  })
  it('returns null when there is nothing to draw', () => {
    expect(parseDimensions('')).toBeNull()
    expect(parseDimensions('около 20 см')).toBeNull()
  })
})

describe('scaleScene', () => {
  it('stands both shapes on one baseline', () => {
    const scene = scaleScene('20 × 17 × 7 см')!
    const { product, card, height, width } = scene
    expect(height).toBe(170)
    expect(product.y + product.h).toBe(height)
    expect(card.y + card.h).toBe(height)
    expect(card.x + card.w).toBeCloseTo(width)
    expect(scene.depth).toBe(70)
  })

  it('uses the two largest sides as the front face', () => {
    const scene = scaleScene('16,9 × 8,3 × 18,7 см')!
    expect([scene.product.w, scene.product.h]).toEqual([187, 169])
    expect(scene.depth).toBe(83)
  })

  it('stands upright things on their short edge', () => {
    const scene = scaleScene('14,96 × 7,15 × 0,83 см', { portrait: true })!
    expect(scene.product.w).toBeCloseTo(71.5)
    expect(scene.product.h).toBeCloseTo(149.6)
  })

  it('draws a round product as a disc', () => {
    const scene = scaleScene('Ø 13,3 × 4,6 см')!
    expect(scene.product).toMatchObject({ w: 133, h: 133, round: true })
    expect(scene.depth).toBe(46)
  })

  it('keeps the card as the tallest shape for small things', () => {
    const scene = scaleScene('4,4 × 3,8 × 1 см')!
    expect(scene.height).toBe(CARD_MM.h)
    expect(scene.product.y).toBe(CARD_MM.h - 38)
  })
})

it('knows which kinds stand upright', () => {
  expect(isPortraitKind('Смартфон')).toBe(true)
  expect(isPortraitKind('Ноутбук')).toBe(false)
})

it('formats millimetres as centimetres', () => {
  expect(formatCm(85.6)).toBe('8,6')
  expect(formatCm(200)).toBe('20')
})
