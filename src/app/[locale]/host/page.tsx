import { Check, HandHeart, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { EditorialPhoto } from '@/components/editorial-photo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createPublicPageMetadata } from '@/features/seo/metadata'
import { getAppLocale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'

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
    path: '/host',
    title: t('hostTitle'),
    description: t('hostDescription'),
    socialImageAlt: t('socialImageAlt'),
  })
}

export default async function HostRecruitmentPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostRecruit')
  const hostControls = t.raw('control') as string[]
  const sofraControls = t.raw('sofra') as string[]

  return (
    <div>
      <section className="container-shell grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-5 text-5xl leading-[.95] font-medium tracking-tight sm:text-7xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-8">
            {t('intro')}
          </p>
          <Button size="lg" className="mt-8 rounded-full" asChild>
            <Link href="/host/apply">{t('cta')}</Link>
          </Button>
        </div>
        <EditorialPhoto
          label={t('photoLabel')}
          className="aspect-[4/5] min-h-[32rem]"
          tone="sage"
        />
      </section>
      <section className="container-shell grid gap-6 pb-20 md:grid-cols-2">
        <ListCard title={t('controlTitle')} items={hostControls} icon="host" />
        <ListCard title={t('sofraTitle')} items={sofraControls} icon="sofra" />
      </section>
      <section className="bg-primary text-primary-foreground">
        <div className="container-shell flex flex-col gap-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-medium">{t('participationTitle')}</h2>
            <p className="text-primary-foreground/75 mt-3 leading-7">
              {t('participationBody')}
            </p>
          </div>
          <HandHeart
            className="size-16 shrink-0 opacity-75"
            aria-hidden="true"
          />
        </div>
      </section>
    </div>
  )
}

function ListCard({
  title,
  items,
  icon,
}: {
  title: string
  items: string[]
  icon: 'host' | 'sofra'
}) {
  const Icon = icon === 'host' ? HandHeart : ShieldCheck
  return (
    <Card className="bg-card/75">
      <CardContent className="p-7 sm:p-9">
        <Icon className="text-primary size-7" aria-hidden="true" />
        <h2 className="mt-5 text-3xl font-medium">{title}</h2>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm">
              <Check
                className="text-primary mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
