import { PRODUCTS } from '../api/mock-db'
import { DEFAULT_FILTERS } from '../model/catalog'
import { applyFilters, searchCatalog, searchProducts, searchScore } from './query'

const names = (list: { name: string }[]) => list.map((p) => p.name)
const slugs = (list: { slug: string }[]) => list.map((p) => p.slug)

describe('search', () => {
  it('ranks name prefix matches first', () => {
    expect(names(searchProducts(PRODUCTS, 'sony'))[0]).toBe('Sony WH-1000XM5')
  })

  it('matches kind and section in Russian, case- and ё-insensitive', () => {
    expect(names(searchProducts(PRODUCTS, 'НАУШНИКИ'))).toContain('Sony WH-1000XM5')
    expect(searchProducts(PRODUCTS, 'клавиатура').map((p) => p.slug)).toEqual(['keychron-k2'])
  })

  it('requires every word to match', () => {
    expect(names(searchProducts(PRODUCTS, 'instax evo'))).toEqual(['Fujifilm instax mini Evo'])
    expect(searchProducts(PRODUCTS, 'sony колонка')).toHaveLength(0)
    expect(searchProducts(PRODUCTS, 'часы красные')).toHaveLength(0)
  })

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchProducts(PRODUCTS, '   ')).toEqual([])
    expect(searchProducts(PRODUCTS, 'а', 3).length).toBeLessThanOrEqual(3)
  })

  it('scores a blank query as a match so filters keep working', () => {
    expect(searchScore(PRODUCTS[0]!, '')).toBeGreaterThan(0)
  })

  it('is applied by catalogue filters', () => {
    const list = applyFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: 'колонка' })
    expect(list.every((p) => p.kind === 'Портативная колонка')).toBe(true)
    expect(slugs(list)).toEqual(['bang-olufsen-beosound-a1-2nd-gen', 'bang-olufsen-beolit-20'])
  })
})

describe('error tolerance', () => {
  it('repairs the keyboard layout and suggests the fix', () => {
    const sony = searchCatalog(PRODUCTS, 'ыщтн')
    // Both Sony products, the more popular first.
    expect(slugs(sony.products)).toEqual(['sony-wh-1000xm5', 'sony-alpha-7-iv'])
    expect(sony.correctedQuery).toBe('sony')

    const phones = searchCatalog(PRODUCTS, 'yfeiybrb')
    expect(slugs(phones.products)).toContain('sony-wh-1000xm5')
    expect(phones.correctedQuery).toBe('наушники')
  })

  it('forgives typos and transpositions', () => {
    const r = searchCatalog(PRODUCTS, 'наушнки')
    expect(slugs(r.products)).toContain('sony-wh-1000xm5')
    expect(r.correctedQuery).toBe('наушники')
    expect(slugs(searchProducts(PRODUCTS, 'клавиатрура'))).toEqual(['keychron-k2'])
    expect(slugs(searchProducts(PRODUCTS, 'smasung'))).toEqual(['samsung-galaxy-s24'])
  })

  it('understands transliterated brand names', () => {
    expect(slugs(searchProducts(PRODUCTS, 'маршалл'))).toEqual(['marshall-major-iv'])
    expect(slugs(searchProducts(PRODUCTS, 'кидл'))).toEqual(['amazon-kindle-paperwhite'])
    expect(slugs(searchProducts(PRODUCTS, 'naushniki'))).toContain('sony-wh-1000xm5')
  })

  it('does not suggest a correction for a correct or unfinished query', () => {
    expect(searchCatalog(PRODUCTS, 'наушники').correctedQuery).toBeNull()
    expect(searchCatalog(PRODUCTS, 'науш').correctedQuery).toBeNull()
    expect(slugs(searchCatalog(PRODUCTS, 'науш').products)).toContain('sony-wh-1000xm5')
  })

  it('finds nothing for random strings', () => {
    for (const junk of ['xyzzy', 'абракадабра', 'qqqq', 'ывфывфыв', 'zzzzzzzz', 'пылесос']) {
      expect(searchCatalog(PRODUCTS, junk)).toEqual({ products: [], correctedQuery: null })
    }
  })
})

describe('attribute and use-case queries', () => {
  it('matches colours by stem, including marketing names', () => {
    const black = searchProducts(PRODUCTS, 'чёрн', 99)
    expect(black.length).toBeGreaterThan(0)
    expect(
      black.every((p) =>
        p.colors.some((c) => /черн|графит|обсидиан|ноч/i.test(c.name.replace('ё', 'е'))),
      ),
    ).toBe(true)
    expect(slugs(searchProducts(PRODUCTS, 'зелёная колонка'))).toEqual([
      'bang-olufsen-beosound-a1-2nd-gen',
    ])
    expect(slugs(searchProducts(PRODUCTS, 'белые наушники'))).toEqual(['apple-airpods-pro-2'])
    // «Платиновый серебристый» counts as silver.
    expect(slugs(searchProducts(PRODUCTS, 'серебристый')).sort()).toEqual([
      'apple-mac-mini-m4',
      'fujifilm-x100vi',
      'sony-wh-1000xm5',
    ])
  })

  it('turns price phrases into a price cap', () => {
    for (const q of ['до 10000', 'до 10 000', 'до 10 000 ₽', 'до 10 тысяч', 'до 10к']) {
      const list = searchProducts(PRODUCTS, q, 99)
      expect(list.length).toBeGreaterThan(0)
      expect(list.every((p) => p.price <= 10_000)).toBe(true)
    }
    const cheap = searchProducts(PRODUCTS, 'колонка дешевле 30000', 99)
    expect(slugs(cheap)).toEqual(['bang-olufsen-beosound-a1-2nd-gen'])
  })

  it('filters in-stock products', () => {
    const list = searchProducts(PRODUCTS, 'фотоаппарат в наличии', 99)
    // X100VI is out of stock.
    expect(slugs(list).sort()).toEqual([
      'fujifilm-instax-mini-evo',
      'ricoh-gr-iiix',
      'sony-alpha-7-iv',
    ])
  })

  it('finds products by use case', () => {
    expect(slugs(searchProducts(PRODUCTS, 'для бега')).sort()).toEqual([
      'apple-airpods-pro-2',
      'apple-watch-ultra-2',
      'garmin-forerunner-55',
    ])
    const gifts = searchProducts(PRODUCTS, 'в подарок', 99)
    expect(gifts.length).toBe(17)
    expect(gifts.every((p) => p.tags.some((t) => t.includes('подар')))).toBe(true)
  })

  it('keeps AND semantics across attributes and words', () => {
    expect(searchProducts(PRODUCTS, 'для бега до 10000')).toHaveLength(0)
    expect(slugs(searchProducts(PRODUCTS, 'часы до 25 000'))).toEqual(['garmin-forerunner-55'])
  })

  it('lets the catalogue use the fuzzy scorer and query constraints', () => {
    const list = applyFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: 'наушнки' })
    expect(slugs(list)).toEqual([
      'sony-wh-1000xm5',
      'apple-airpods-pro-2',
      'apple-airpods-max',
      'marshall-major-iv',
    ])
    const capped = applyFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: 'до 10 000 ₽' })
    expect(capped.every((p) => p.price <= 10_000)).toBe(true)
  })
})

describe('model codes typed on a Russian layout', () => {
  it('reads a Cyrillic "х" in a model code as Latin "x"', () => {
    const r = searchCatalog(PRODUCTS, 'х100')
    expect(r.products[0]?.slug).toBe('fujifilm-x100vi')
    expect(r.correctedQuery).toBeNull()
    expect(searchCatalog(PRODUCTS, 'фуджи х100').correctedQuery).toBeNull()
    expect(searchCatalog(PRODUCTS, 'х10').products[0]?.slug).not.toBe('sony-wh-1000xm5')
  })

  it('still repairs whole words typed on the wrong layout', () => {
    expect(searchCatalog(PRODUCTS, 'ыщтн').products[0]?.slug).toBe('sony-wh-1000xm5')
    expect(slugs(searchProducts(PRODUCTS, ',tu'))).toContain('garmin-forerunner-55')
  })
})

describe('brand and model in Russian', () => {
  it.each([
    ['пиксель 9 про', 'google-pixel-9-pro'],
    ['айфон про', 'apple-iphone-16-pro'],
    ['инстакс мини', 'fujifilm-instax-mini-evo'],
    ['макбук эйр', 'apple-macbook-air-13-m4'],
    ['макбук эир', 'apple-macbook-air-13-m4'],
    ['мх мастер', 'logitech-mx-master-3s'],
    ['киндл пэйпервайт', 'amazon-kindle-paperwhite'],
    ['gr3x', 'ricoh-gr-iiix'],
    ['аирподс про', 'apple-airpods-pro-2'],
  ])('%s → %s', (query, slug) => {
    expect(searchProducts(PRODUCTS, query)[0]?.slug).toBe(slug)
  })

  it('keeps exact Latin queries tight and does not "correct" Russian words', () => {
    expect(slugs(searchProducts(PRODUCTS, 'pixel 9 pro'))).toEqual(['google-pixel-9-pro'])
    expect(searchCatalog(PRODUCTS, 'про').correctedQuery).toBeNull()
  })
})

describe('category words', () => {
  const watchKinds = ['Умные часы', 'Спортивные часы']

  it('matches what the word names, not the section it shares a name with', () => {
    for (const q of ['часы', 'смарт часы', 'смарт-часы']) {
      const list = searchProducts(PRODUCTS, q, 99)
      expect(list.length).toBeGreaterThan(0)
      expect(list.every((p) => watchKinds.includes(p.kind))).toBe(true)
    }
    expect(slugs(searchProducts(PRODUCTS, 'смартфон', 99)).sort()).toEqual([
      'apple-iphone-16-pro',
      'google-pixel-9-pro',
      'samsung-galaxy-s24',
    ])
    expect(slugs(searchProducts(PRODUCTS, 'ноутбук', 99))).toEqual(['apple-macbook-air-13-m4'])
  })

  it('ranks the catalogue by relevance for a query', () => {
    const list = applyFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: 'часы' })
    expect(watchKinds).toContain(list[0]?.kind)
  })
})

describe('everyday product nouns', () => {
  it.each([
    ['мышка', 'logitech-mx-master-3s'],
    ['e-book', 'amazon-kindle-paperwhite'],
    ['мгновенная печать', 'fujifilm-instax-mini-evo'],
  ])('%s → %s', (query, slug) => {
    expect(searchProducts(PRODUCTS, query)[0]?.slug).toBe(slug)
  })

  it('finds nothing for accessories the store does not sell', () => {
    expect(searchProducts(PRODUCTS, 'чехол')).toEqual([])
  })
})
