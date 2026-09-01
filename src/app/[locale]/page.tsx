import {
  ArrowRight,
  Check,
  Coffee,
  ShieldCheck,
  Soup,
  UsersRound,
} from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EditorialPhoto } from '@/components/editorial-photo'
import { TableCard } from '@/components/table-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createPublicPageMetadata } from '@/features/seo/metadata'
import { getAppLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { listPublicTables } from '@/server/repositories/queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const appLocale = getAppLocale(locale)
  const t = await getTranslations({ locale: appLocale, namespace: 'Meta' })
  return createPublicPageMetadata({
    locale: appLocale,
    path: '/',
    title: t('homeTitle'),
    description: t('homeDescription'),
    socialImageAlt: t('socialImageAlt'),
  })
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Home')
  const common = await getTranslations('Common')
  const tables = (await listPublicTables()).slice(0, 3)
  const rhythm = t.raw('rhythm') as string[]
  const trust = [
    { icon: ShieldCheck, title: t('trustOne'), body: t('trustOneText') },
    { icon: Soup, title: t('trustTwo'), body: t('trustTwoText') },
    { icon: UsersRound, title: t('trustThree'), body: t('trustThreeText') },
  ]

  return (
    <>
      <section className="container-shell grid min-h-[calc(100vh-7rem)] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
        <div className="max-w-3xl">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-5 text-5xl leading-[0.92] font-medium tracking-[-0.04em] sm:text-7xl lg:text-[5.7rem]">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-7 max-w-2xl text-lg leading-8 sm:text-xl">
            {t('intro')}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-full px-7" asChild>
              <Link href="/tables">
                {t('primaryCta')}{' '}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full px-7"
              asChild
            >
              <Link href="/how-it-works">{t('secondaryCta')}</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium">
            <span className="flex items-center gap-2">
              <Check className="text-primary size-4" aria-hidden="true" />
              {common('verifiedHost')}
            </span>
            <span className="flex items-center gap-2">
              <Check className="text-primary size-4" aria-hidden="true" />
              {common('allInclusive')}
            </span>
            <span className="flex items-center gap-2">
              <Check className="text-primary size-4" aria-hidden="true" />
              {common('approximateArea')}
            </span>
          </div>
        </div>
        <div className="relative pb-12 sm:ps-12">
          <EditorialPhoto
            label={t('photoLabel')}
            className="aspect-[4/5] min-h-0 sm:min-h-[30rem]"
            showLabel={false}
          />
          <Card className="bg-card/95 absolute start-0 bottom-0 max-w-sm shadow-2xl backdrop-blur">
            <CardContent className="flex gap-4 p-5">
              <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
                <Coffee className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-heading text-xl font-semibold">
                  {t('teaTitle')}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {t('teaBody')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-card/55 border-y">
        <div className="container-shell grid divide-y py-2 md:grid-cols-3 md:divide-x md:divide-y-0">
          {trust.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="px-0 py-8 md:px-8 first:md:ps-0 last:md:pe-0"
            >
              <Icon className="text-primary size-5" aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-medium">{title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell py-24">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">{t('seasonEyebrow')}</p>
            <h2 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
              {t('nextTitle')}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              {t('nextIntro')}
            </p>
          </div>
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/tables">
              {common('browseTables')} <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} locale={locale} />
          ))}
        </div>
      </section>

      <section className="bg-primary text-primary-foreground overflow-hidden">
        <div className="container-shell grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="text-primary-foreground/70 text-xs font-semibold tracking-[0.16em] uppercase">
              {t('storyEyebrow')}
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-medium sm:text-6xl">
              {t('storyTitle')}
            </h2>
          </div>
          <p className="text-primary-foreground/75 max-w-xl text-lg leading-8">
            {t('storyBody')}
          </p>
        </div>
      </section>

      <section className="container-shell grid gap-12 py-24 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div className="lg:sticky lg:top-32">
          <p className="eyebrow">{t('rhythmEyebrow')}</p>
          <h2 className="mt-3 text-4xl font-medium sm:text-5xl">
            {t('rhythmTitle')}
          </h2>
        </div>
        <ol className="border-border border-t">
          {rhythm.map((step, index) => (
            <li
              key={step}
              className="border-border grid grid-cols-[3rem_1fr] items-center border-b py-6"
            >
              <span
                className="text-clay font-heading text-2xl"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-lg font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
