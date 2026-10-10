import { coverSizes, parseRatio } from './cover-sizes'

describe('parseRatio', () => {
  it.each([
    ['4 / 5', 0.8],
    ['1/1', 1],
    ['16 / 9', 16 / 9],
    ['', undefined],
    [undefined, undefined],
    ['wide', undefined],
  ])('parses %j', (input, value) => expect(parseRatio(input)).toBe(value))
})

describe('coverSizes', () => {
  it('widens sizes for a landscape photo in a portrait frame', () => {
    // 1600×1067 in 4:5: k = 1.4995 / 0.8 = 1.874
    expect(coverSizes('50vw', 1600 / 1067, 0.8)).toBe('calc(50vw * 1.87)')
  })

  it('keeps media conditions and multiplies fixed px lengths out', () => {
    expect(coverSizes('(min-width: 1320px) 760px, 100vw', 1.5, 0.8)).toBe(
      '(min-width: 1320px) 1429px, calc(100vw * 1.88)',
    )
  })

  it('leaves sizes alone when the photo is not wider than the frame', () => {
    expect(coverSizes('50vw', 0.75, 0.8)).toBe('50vw')
    expect(coverSizes('50vw', 1, 1)).toBe('50vw')
  })

  it('does not split commas inside functions', () => {
    expect(coverSizes('min(100vw, calc(100vh * 1.5))', 2, 1)).toBe(
      'calc(min(100vw, calc(100vh * 1.5)) * 2)',
    )
  })
})
