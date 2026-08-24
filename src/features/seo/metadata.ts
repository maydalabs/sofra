import type { Metadata } from 'next'

import type { AppLocale } from '@/i18n/routing'

import {
  getPublicPageRobots,
  getSeoRuntimeConfig,
  type SeoRuntimeConfig,
} from './config'

const socialImage = {
  url: '/og.png',
  width: 1734,
  height: 907,
}

function localePath(locale: AppLocale, path: string) {
  return `/${locale}${path === '/' ? '' : path}`
}

export function createPublicPageMetadata(
  {
    locale,
    path,
    title,
    description,
    socialImageAlt,
    includeSocialImage = true,
  }: {
    locale: AppLocale
    path: string
    title: string
    description: string
    socialImageAlt: string
    includeSocialImage?: boolean
  },
  runtime: SeoRuntimeConfig = getSeoRuntimeConfig(),
): Metadata {
  const canonical = localePath(locale, path)
  const alternateLocale = locale === 'en' ? 'tr_TR' : 'en_US'
  const images = includeSocialImage
    ? [{ ...socialImage, alt: socialImageAlt }]
    : []

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: {
        en: localePath('en', path),
        tr: localePath('tr', path),
        'x-default': localePath('en', path),
      },
    },
    robots: getPublicPageRobots(runtime),
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: 'Sofra',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      alternateLocale: [alternateLocale],
      images,
    },
    twitter: {
      card: includeSocialImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  }
}
