import {
  bestMatch,
  damerauLevenshtein,
  matchToken,
  maxEdits,
  meaningfulWords,
  normalizeText,
  queryWords,
  swapLayout,
  translit,
} from './fuzzy'

describe('normalizeText', () => {
  it('lowercases, folds ё, strips punctuation and collapses spaces', () => {
    expect(normalizeText('  Чёрный,   WH-1000XM5! ')).toBe('черный wh 1000xm5')
    expect(normalizeText('Nothing Phone (2a)')).toBe('nothing phone 2a')
  })
})

describe('swapLayout', () => {
  it('repairs text typed in the wrong layout, both ways', () => {
    expect(swapLayout('ыщтн')).toBe('sony')
    expect(swapLayout('yfeiybrb')).toBe('наушники')
    expect(swapLayout('sony')).toBe('ыщтн')
    // Punctuation keys are letters on the Russian layout.
    expect(swapLayout('rjkjyrf')).toBe('колонка')
    expect(swapLayout(',fyr')).toBe('банк')
  })
})

describe('translit', () => {
  it('transliterates brand words between alphabets', () => {
    expect(translit('маршалл')).toBe('marshall')
    expect(translit('naushniki')).toBe('наушники')
    expect(translit('фуджифилм')).toBe('fujifilm')
  })
})

describe('damerauLevenshtein', () => {
  it('counts insertions, deletions, substitutions and transpositions', () => {
    expect(damerauLevenshtein('наушники', 'наушники')).toBe(0)
    expect(damerauLevenshtein('наушнки', 'наушники')).toBe(1)
    expect(damerauLevenshtein('нуашники', 'наушники')).toBe(1)
    expect(damerauLevenshtein('kitten', 'sitting')).toBe(3)
    expect(damerauLevenshtein('', 'abc')).toBe(3)
  })

  it('stops early past the budget', () => {
    expect(damerauLevenshtein('клавиатура', 'фотоаппарат', 2)).toBe(3)
    expect(damerauLevenshtein('a', 'abcdef', 2)).toBe(3)
  })
})

describe('maxEdits', () => {
  it('scales the typo budget with word length', () => {
    expect(maxEdits('сон')).toBe(0)
    expect(maxEdits('часы')).toBe(1)
    expect(maxEdits('колонка')).toBe(1)
    expect(maxEdits('наушники')).toBe(2)
    expect(maxEdits('1000xm5')).toBe(0)
  })
})

describe('matchToken', () => {
  it('prefers exact over prefix over fuzzy', () => {
    const exact = matchToken('часы', 'часы')?.quality ?? 0
    const prefix = matchToken('час', 'часы')?.quality ?? 0
    const fuzzy = matchToken('чесы', 'часы')?.quality ?? 0
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(fuzzy)
    expect(fuzzy).toBeGreaterThan(0)
  })

  it('only lets the unfinished word match by a short prefix', () => {
    expect(matchToken('на', 'наушники')).toBeNull()
    expect(matchToken('на', 'наушники', true)?.kind).toBe('prefix')
  })

  it('does not fuzz short words or model numbers', () => {
    expect(matchToken('сок', 'сон')).toBeNull()
    expect(matchToken('1000xm4', '1000xm5')).toBeNull()
  })

  it('tolerates a slip in a word still being typed', () => {
    expect(matchToken('нашуни', 'наушники', true)?.kind).toBe('fuzzy')
  })
})

describe('bestMatch', () => {
  it('returns the best token or null', () => {
    expect(bestMatch('наушнки', ['накладные', 'наушники'])?.token).toBe('наушники')
    expect(bestMatch('xyz', ['наушники'])).toBeNull()
  })
})

describe('queryWords', () => {
  it('offers layout and transliteration variants and marks the last word', () => {
    const [first, last] = queryWords('ыщтн yfeiybrb')
    expect(first?.variants).toEqual(['ыщтн', 'sony', 'yschtn'])
    expect(first?.partial).toBe(false)
    expect(last?.variants).toContain('наушники')
    expect(last?.partial).toBe(true)
  })

  it('treats a trailing space as a finished word', () => {
    expect(queryWords('часы ').at(-1)?.partial).toBe(false)
  })

  it('splits hyphenated model names into words', () => {
    expect(queryWords('wh-1000xm5').map((w) => w.typed)).toEqual(['wh', '1000xm5'])
  })

  it('drops stop words unless nothing else is left', () => {
    expect(meaningfulWords(queryWords('для бега')).map((w) => w.typed)).toEqual(['бега'])
    expect(meaningfulWords(queryWords('для')).map((w) => w.typed)).toEqual(['для'])
  })
})
