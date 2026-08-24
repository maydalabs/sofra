import type { MetadataRoute } from 'next'

import { getSeoRuntimeConfig } from '@/features/seo/config'

const privatePaths = [
  '/en/account',
  '/tr/account',
  '/en/admin',
  '/tr/admin',
  '/en/partner',
  '/tr/partner',
  '/en/demo',
  '/tr/demo',
  '/en/sign-in',
  '/tr/sign-in',
  '/en/verify-email',
  '/tr/verify-email',
  '/en/unavailable',
  '/tr/unavailable',
  '/en/host/apply',
  '/tr/host/apply',
  '/en/host/dashboard',
  '/tr/host/dashboard',
  '/en/host/tables',
  '/tr/host/tables',
  '/en/host/household',
  '/tr/host/household',
  '/en/host/address',
  '/tr/host/address',
  '/*/tables/*/book',
]

export default function robots(): MetadataRoute.Robots {
  const runtime = getSeoRuntimeConfig()
  if (!runtime.allowIndexing) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: privatePaths,
    },
    sitemap: new URL('/sitemap.xml', runtime.appUrl).toString(),
  }
}
