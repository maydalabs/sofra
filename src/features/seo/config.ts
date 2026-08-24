import type { Metadata } from 'next'

const localAppUrl = 'http://localhost:3000'

export interface SeoRuntimeConfig {
  appUrl: URL
  allowIndexing: boolean
}

function parseIndexingFlag(value: string | undefined) {
  if (!value || value === 'false') return false
  if (value === 'true') return true
  throw new Error('SOFRA_ALLOW_INDEXING must be either true or false')
}

export function getSeoRuntimeConfig(
  environment: Record<string, string | undefined> = process.env,
): SeoRuntimeConfig {
  const appUrl = new URL(environment.NEXT_PUBLIC_APP_URL || localAppUrl)
  if (!['http:', 'https:'].includes(appUrl.protocol)) {
    throw new Error('NEXT_PUBLIC_APP_URL must use http or https')
  }
  if (
    appUrl.username ||
    appUrl.password ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash
  ) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL must be an origin without credentials, a path, a query, or a hash',
    )
  }

  const normalizedAppUrl = new URL(appUrl.origin)
  const allowIndexing = parseIndexingFlag(environment.SOFRA_ALLOW_INDEXING)
  if (allowIndexing && normalizedAppUrl.protocol !== 'https:') {
    throw new Error(
      'SOFRA_ALLOW_INDEXING requires an HTTPS NEXT_PUBLIC_APP_URL',
    )
  }

  return { appUrl: normalizedAppUrl, allowIndexing }
}

export const privatePageRobots = {
  index: false,
  follow: false,
  noarchive: true,
  nocache: true,
  noimageindex: true,
  nosnippet: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
    noimageindex: true,
    nosnippet: true,
  },
} satisfies Metadata['robots']

export const privatePageMetadata = {
  robots: privatePageRobots,
} satisfies Metadata

export function getPublicPageRobots(
  runtime = getSeoRuntimeConfig(),
): Metadata['robots'] {
  if (!runtime.allowIndexing) return privatePageRobots
  return {
    index: true,
    follow: true,
    noarchive: false,
    googleBot: {
      index: true,
      follow: true,
      noarchive: false,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  }
}
