import { describe, expect, it } from 'vitest'

import { getPublicDemoTables } from '@/features/hosted-tables/demo-tables'

import { getSeoRuntimeConfig } from './config'
import { createPublicPageMetadata } from './metadata'
import {
  createPublicTableEventJsonLd,
  serializeJsonLd,
} from './structured-data'

describe('SEO runtime configuration', () => {
  it('defaults to a local origin with indexing safely disabled', () => {
    expect(getSeoRuntimeConfig({})).toEqual({
      appUrl: new URL('http://localhost:3000'),
      allowIndexing: false,
    })
  })

  it('allows indexing only for an explicitly configured HTTPS origin', () => {
    expect(
      getSeoRuntimeConfig({
        NEXT_PUBLIC_APP_URL: 'https://sofra.example/',
        SOFRA_ALLOW_INDEXING: 'true',
      }),
    ).toEqual({
      appUrl: new URL('https://sofra.example'),
      allowIndexing: true,
    })

    expect(() =>
      getSeoRuntimeConfig({
        NEXT_PUBLIC_APP_URL: 'http://sofra.example',
        SOFRA_ALLOW_INDEXING: 'true',
      }),
    ).toThrow(/requires an HTTPS/i)
    expect(() =>
      getSeoRuntimeConfig({ NEXT_PUBLIC_APP_URL: 'https://sofra.example/app' }),
    ).toThrow(/must be an origin/i)
  })
})

describe('localized public metadata', () => {
  it('sets canonical language alternates and clears inherited detail images', () => {
    const metadata = createPublicPageMetadata(
      {
        locale: 'tr',
        path: '/tables/demo-table',
        title: 'Demo sofrası · Sofra',
        description: 'Kamusal ve güvenli sofra açıklaması.',
        socialImageAlt: 'Sofra akşam yemeği',
        includeSocialImage: false,
      },
      {
        appUrl: new URL('https://sofra.example'),
        allowIndexing: true,
      },
    )

    expect(metadata.alternates).toEqual({
      canonical: '/tr/tables/demo-table',
      languages: {
        en: '/en/tables/demo-table',
        tr: '/tr/tables/demo-table',
        'x-default': '/en/tables/demo-table',
      },
    })
    expect(metadata.robots).toMatchObject({ index: true, follow: true })
    expect(metadata.openGraph).toMatchObject({ images: [] })
    expect(metadata.twitter).toMatchObject({ card: 'summary', images: [] })
  })
})

describe('public table structured data', () => {
  it('uses only the approved public projection and approximate place name', () => {
    const table = getPublicDemoTables()[0]
    const jsonLd = createPublicTableEventJsonLd(table, 'en')
    const serialized = serializeJsonLd(jsonLd)

    expect(jsonLd.location).toEqual({
      '@type': 'Place',
      name: table.neighborhood,
    })
    expect(jsonLd.offers.priceCurrency).toBe('TRY')
    expect(serialized).not.toMatch(
      /exactAddress|preciseCoordinate|publicCoordinate|arrivalInstructions|privateAddressId|joiningPartySummaries|leadHostName/i,
    )
  })

  it('escapes markup before embedding JSON in HTML', () => {
    expect(serializeJsonLd({ value: '</script>' })).toContain('\\u003c/script>')
  })
})
