import type { Metadata } from 'next'
import {
  CalendarDays,
  Check,
  Clock3,
  Coffee,
  Languages,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { EditorialPhoto } from '@/components/editorial-photo'
import { NeighborhoodMap } from '@/components/neighborhood-map'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatTry } from '@/features/pricing/pricing'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { findPublicTableBySlug } from '@/server/repositories/queries'

type PageProps = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const table = await findPublicTableBySlug(slug)
  if (!table) return { title: 'Table unavailable' }
  return { title: table.menuTitle, description: table.menuDescription }
}

export default async function TableDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const table = await findPublicTableBySlug(slug)
  if (!table) notFound()
  const t = await getTranslations('Table')
  const common = await getTranslations('Common')
  const isBookable = table.status !== 'roster_locked'

  return (
    <div>
      <section className="container-shell pt-8 sm:pt-12">
        <Button variant="ghost" className="-ms-4" asChild>
          <Link href="/tables">← {common('backToTables')}</Link>
        </Button>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <EditorialPhoto
            label={`${table.householdName} · replaceable household photography`}
            className="aspect-[16/10] min-h-0 lg:row-span-2"
          />
          <EditorialPhoto
            label="Replaceable menu photography"
            className="aspect-[16/9] min-h-0"
            tone="sage"
          />
          <div className="grid grid-cols-2 gap-5">
            <EditorialPhoto
              label="Tea and conversation"
              className="aspect-square min-h-0"
              tone="ink"
            />
            <EditorialPhoto
              label={table.neighborhood}
              className="aspect-square min-h-0"
            />
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-12 py-12 lg:grid-cols-[1fr_23rem] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>
              {table.format === 'shared' ? common('shared') : common('private')}
            </Badge>
            <Badge variant="outline">
              <ShieldCheck className="size-3" />
              {common('verifiedHost')}
            </Badge>
            {table.guaranteedOperation ? (
              <Badge variant="secondary">{common('guaranteed')}</Badge>
            ) : null}
          </div>
          <h1 className="mt-5 max-w-4xl text-5xl leading-[.96] font-medium tracking-tight sm:text-7xl">
            {table.menuTitle}
          </h1>
          <p className="text-muted-foreground mt-5 text-lg">
            {t('hostedBy', { name: table.leadHostName })} ·{' '}
            {table.householdName}
          </p>
          <div className="border-border mt-9 grid gap-4 border-y py-6 text-sm sm:grid-cols-2">
            <span className="flex items-center gap-3">
              <CalendarDays className="text-primary size-4" />
              {formatTableDate(table.startsAt, locale)}
            </span>
            <span className="flex items-center gap-3">
              <MapPin className="text-primary size-4" />
              {table.neighborhood}
            </span>
            <span className="flex items-center gap-3">
              <Languages className="text-primary size-4" />
              {table.languages.join(' · ')}
            </span>
            <span className="flex items-center gap-3">
              <Users className="text-primary size-4" />
              {common('seatsLeft', { count: table.availableSeats })}
            </span>
          </div>

          <div className="mt-12 space-y-12">
            <section>
              <p className="eyebrow">{t('household')}</p>
              <h2 className="mt-3 text-4xl font-medium">
                {table.householdStructure}
              </h2>
              <p className="text-muted-foreground mt-4 max-w-3xl text-base leading-8">
                {table.householdStory}
              </p>
            </section>
            <section className="bg-secondary/75 rounded-3xl border p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <Coffee className="text-primary size-5" />
                <p className="eyebrow">{t('menu')}</p>
              </div>
              <p className="font-heading mt-5 text-3xl leading-snug">
                {table.menuDescription}
              </p>
              <Separator className="my-6" />
              <p className="text-muted-foreground text-sm leading-6">
                {t('menuNote')}
              </p>
            </section>
            <div className="grid gap-8 sm:grid-cols-2">
              <DetailBlock title={t('evening')} body={table.atmosphere} />
              <DetailBlock
                title={t('participants')}
                body={table.expectedHouseholdParticipants}
              />
              <DetailBlock
                title={t('practical')}
                body={table.practicalInformation}
              />
              <DetailBlock
                title={t('accessibility')}
                body={table.accessibilityInformation}
              />
            </div>
            <section>
              <h2 className="text-4xl font-medium">{t('joiningTitle')}</h2>
              {table.joiningPartySummaries.length ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {table.joiningPartySummaries.map((summary) => (
                    <li
                      key={summary}
                      className="bg-card flex gap-3 rounded-2xl border p-4 text-sm"
                    >
                      <Users className="text-primary size-4 shrink-0" />
                      {summary}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-3">{t('noneJoining')}</p>
              )}
            </section>
            <section>
              <p className="eyebrow">{t('where')}</p>
              <h2 className="mt-3 text-4xl font-medium">
                {table.neighborhood}
              </h2>
              <p className="text-muted-foreground mt-3 mb-6 max-w-xl">
                {t('whereNote')}
              </p>
              <NeighborhoodMap table={table} />
            </section>
          </div>
        </div>

        <Card className="bg-card/95 shadow-xl lg:sticky lg:top-28">
          <CardHeader>
            <p className="font-heading text-4xl font-semibold">
              {formatTry(
                table.guestPriceKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            </p>
            <p className="text-muted-foreground text-sm">
              {common('allInclusive')} · {common('perPerson')}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 text-sm">
              <p className="flex gap-3">
                <Check className="text-primary size-4 shrink-0" />
                {t('priceIncludes')}
              </p>
              <p className="flex gap-3">
                <Clock3 className="text-primary size-4 shrink-0" />
                {formatTableDate(table.startsAt, locale)}
              </p>
              <p className="flex gap-3">
                <MapPin className="text-primary size-4 shrink-0" />
                {t('exactAddress')}
              </p>
            </div>
            {!table.guaranteedOperation ? (
              <p className="bg-muted rounded-xl p-3 text-xs leading-5">
                {t('minimumNote', { count: table.minimumGuestCount })}
              </p>
            ) : null}
            <Button
              className="h-12 w-full rounded-full"
              disabled={!isBookable}
              asChild={isBookable}
            >
              {isBookable ? (
                <Link href={`/tables/${table.slug}/book`}>{t('reserve')}</Link>
              ) : (
                <span>Roster locked</span>
              )}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-t pt-5">
      <h2 className="text-2xl font-medium">{title}</h2>
      <p className="text-muted-foreground mt-3 text-sm leading-6">{body}</p>
    </section>
  )
}
