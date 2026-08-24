import type { MetadataRoute } from 'next'

import { getSeoRuntimeConfig } from '@/features/seo/config'
import { routing } from '@/i18n/routing'
import { listPublicTables } from '@/server/repositories/queries'

export const revalidate = 3600

const publicPaths = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/tables', changeFrequency: 'daily', priority: 0.9 },
  { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/host', changeFrequency: 'monthly', priority: 0.6 },
] as const

function absoluteUrl(path: string, appUrl: URL) {
  return new URL(path, appUrl).toString()
}

function localizedAlternates(path: string, appUrl: URL) {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [
        locale,
        absoluteUrl(`/${locale}${path === '/' ? '' : path}`, appUrl),
      ]),
    ),
    'x-default': absoluteUrl(`/en${path === '/' ? '' : path}`, appUrl),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const runtime = getSeoRuntimeConfig()
  if (!runtime.allowIndexing) return []

  const tables = await listPublicTables()
  const routeEntries: MetadataRoute.Sitemap = publicPaths.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(
        `/${locale}${route.path === '/' ? '' : route.path}`,
        runtime.appUrl,
      ),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: localizedAlternates(route.path, runtime.appUrl),
      },
    })),
  )
  const tableEntries: MetadataRoute.Sitemap = tables.flatMap((table) => {
    const path = `/tables/${table.slug}`
    return routing.locales.map((locale) => ({
      url: absoluteUrl(`/${locale}${path}`, runtime.appUrl),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: localizedAlternates(path, runtime.appUrl),
      },
    }))
  })

  return [...routeEntries, ...tableEntries]
}
