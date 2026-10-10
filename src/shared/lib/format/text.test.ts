import { normalize, splitMatch } from './text'

describe('normalize', () => {
  it('lowercases, trims and folds ё', () => expect(normalize('  Ёлка ')).toBe('елка'))
})

describe('splitMatch', () => {
  it('flags every occurrence, preserving original casing', () => {
    expect(splitMatch('Sony sony', 'SONY')).toEqual([
      { text: 'Sony', hit: true },
      { text: ' ', hit: false },
      { text: 'sony', hit: true },
    ])
  })
  it('highlights each word of a multi-word query', () => {
    expect(splitMatch('Instax Mini 12', 'mini instax').filter((p) => p.hit)).toEqual([
      { text: 'Instax', hit: true },
      { text: 'Mini', hit: true },
    ])
  })
  it('returns the whole text when the query is empty', () => {
    expect(splitMatch('JBL', '')).toEqual([{ text: 'JBL', hit: false }])
  })
})
