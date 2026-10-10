import { routes, SUPPORT } from '@/shared/config'

const NAME = 'Импульс'

/**
 * Site-wide schema.org graph: who sells (Organization with a support contact)
 * and how to search the site (WebSite + SearchAction → catalog query).
 */
export function buildSiteJsonLd(origin: string) {
  const url = `${origin}${routes.home()}`
  const organization = {
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: NAME,
    url,
    email: SUPPORT.email,
    sameAs: [SUPPORT.telegram],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: SUPPORT.phoneHref.replace(/^tel:/, ''),
      email: SUPPORT.email,
      areaServed: 'RU',
      availableLanguage: 'Russian',
    },
  }
  const website = {
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name: NAME,
    url,
    inLanguage: 'ru',
    publisher: { '@id': `${url}#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}${routes.catalog()}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [organization, website] as const,
  }
}

/** JSON for an inline <script>: "<" is escaped so the payload can never close the tag. */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
