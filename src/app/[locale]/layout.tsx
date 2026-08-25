import { hasLocale, NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'
import { notFound } from 'next/navigation'

import { DemoBanner } from '@/components/demo-banner'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  const messages = await getMessages()
  const accessibility = await getTranslations('Accessibility')
  const clientMessages = {
    Common: messages.Common,
    Navigation: messages.Navigation,
    States: messages.States,
  }

  return (
    <NextIntlClientProvider messages={clientMessages}>
      <div lang={locale} className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring sr-only z-[100] rounded-lg px-4 py-3 text-sm font-semibold shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:ring-3 focus:outline-none"
        >
          {accessibility('skipToContent')}
        </a>
        <DemoBanner />
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  )
}
