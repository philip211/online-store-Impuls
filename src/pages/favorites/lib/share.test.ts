import { consultMailto, parseShareSlugs, SHARE_PARAM, sharePath } from './share'

describe('parseShareSlugs', () => {
  it.each([
    [null, []],
    ['', []],
    ['jbl-flip-6,sony-wh-1000xm5,jbl-flip-6', ['jbl-flip-6', 'sony-wh-1000xm5']],
    [' ricoh-gr-iiix , X, ../etc, a--b, -a, 4', ['ricoh-gr-iiix', '4']],
  ])('parses %j', (input, slugs) => expect(parseShareSlugs(input)).toEqual(slugs))

  it('caps the list', () => {
    const many = Array.from({ length: 80 }, (_, i) => `p-${i}`).join(',')
    expect(parseShareSlugs(many)).toHaveLength(50)
  })
})

describe('sharePath', () => {
  it('round-trips through parseShareSlugs', () => {
    const path = sharePath(['ricoh-gr-iiix', 'keychron-k2'])
    expect(path).toBe('/favorites?items=ricoh-gr-iiix,keychron-k2')
    const value = new URL(path, 'https://x.ru').searchParams.get(SHARE_PARAM)
    expect(parseShareSlugs(value)).toEqual(['ricoh-gr-iiix', 'keychron-k2'])
  })
})

describe('consultMailto', () => {
  it('writes the list with prices and links', () => {
    const href = consultMailto('hello@impulse.store', 'https://impulse.store', [
      { name: 'JBL Flip 6', price: 9_990, slug: 'jbl-flip-6' },
    ])
    expect(href.startsWith('mailto:hello@impulse.store?subject=')).toBe(true)
    const body = decodeURIComponent(href.split('&body=')[1]!)
    expect(body).toContain('1. JBL Flip 6')
    expect(body).toContain('https://impulse.store/product/jbl-flip-6')
    expect(body).toContain('https://impulse.store/favorites?items=jbl-flip-6')
  })
})
