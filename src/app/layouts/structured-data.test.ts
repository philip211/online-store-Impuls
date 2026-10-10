import { buildSiteJsonLd, serializeJsonLd } from './structured-data'

describe('buildSiteJsonLd', () => {
  const data = buildSiteJsonLd('https://impulse.store')
  const [org, site] = data['@graph']

  it('describes the organization with a support contact', () => {
    expect(org).toMatchObject({
      '@type': 'Organization',
      name: 'Импульс',
      url: 'https://impulse.store/',
      contactPoint: { '@type': 'ContactPoint', telephone: '+78005553535' },
    })
  })

  it('points the site search at the catalog query', () => {
    expect(site.potentialAction.target.urlTemplate).toBe(
      'https://impulse.store/catalog?q={search_term_string}',
    )
    expect(site.potentialAction['query-input']).toBe('required name=search_term_string')
  })
})

describe('serializeJsonLd', () => {
  it('escapes "<" so the payload cannot close the script tag', () => {
    const json = serializeJsonLd({ x: '</script><b>' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json)).toEqual({ x: '</script><b>' })
  })
})
