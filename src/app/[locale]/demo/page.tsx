import { BriefcaseBusiness, House, ShieldCheck, UserRound } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { chooseDemoPersona } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { isDemoMode } from '@/server/auth/demo-session'

export default async function DemoPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isDemoMode()) redirect(`/${locale}/unavailable`)
  setRequestLocale(locale)
  const t = await getTranslations('Demo')
  const personas = [
    {
      value: 'traveler',
      label: t('traveler'),
      icon: UserRound,
      detail: 'Bookings, profile, dietary privacy, and reviews',
    },
    {
      value: 'host',
      label: t('host'),
      icon: House,
      detail: 'Household, scheduled tables, guests, and payout demo',
    },
    {
      value: 'partner',
      label: t('partner'),
      icon: BriefcaseBusiness,
      detail: 'Upcoming tables and referral attribution',
    },
    {
      value: 'operator',
      label: t('operator'),
      icon: ShieldCheck,
      detail: 'Approval queues, incidents, pricing, and audit records',
    },
  ] as const

  return (
    <div className="container-shell py-16 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="eyebrow">Local development only</p>
        <h1 className="mt-4 text-5xl font-medium sm:text-6xl">{t('title')}</h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-2xl leading-7">
          {t('intro')}
        </p>
      </div>
      <Card className="border-primary/20 bg-primary/5 mx-auto mt-10 max-w-4xl">
        <CardContent className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">{t('guidedEyebrow')}</p>
            <h2 className="mt-2 text-3xl font-medium">{t('guidedTitle')}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {t('guidedBody')}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/demo/journey">{t('guidedCta')}</Link>
          </Button>
        </CardContent>
      </Card>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {personas.map(({ value, label, icon: Icon, detail }) => (
          <Card key={value} className="bg-card/80">
            <CardContent className="p-6">
              <Icon className="text-primary size-6" />
              <h2 className="mt-5 text-2xl font-medium">{label}</h2>
              <p className="text-muted-foreground mt-2 min-h-12 text-sm leading-6">
                {detail}
              </p>
              <form action={chooseDemoPersona} className="mt-6">
                <input type="hidden" name="persona" value={value} />
                <input type="hidden" name="locale" value={locale} />
                <Button className="w-full" type="submit">
                  {label}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
