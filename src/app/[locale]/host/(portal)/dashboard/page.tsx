import {
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  UsersRound,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isHostCertificationActive } from '@/features/hosts/certification'
import { formatTry } from '@/features/pricing/pricing'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { getCurrentActor } from '@/server/auth/current-actor'
import {
  findHostCertification,
  listHostRoster,
  listHostTables,
} from '@/server/repositories/queries'
import { getServerTimeMilliseconds } from '@/server/time/clock'

export default async function HostDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  const [tables, certification] = await Promise.all([
    listHostTables(actor.id),
    findHostCertification(actor.id),
  ])
  const upcoming = tables.filter(
    (table) => !['completed', 'archived', 'cancelled'].includes(table.status),
  )
  const rosters = await Promise.all(
    upcoming.map(async (table) => ({
      table,
      parties: await listHostRoster(actor.id, table.id),
    })),
  )
  const confirmedTravelers = rosters.reduce(
    (total, roster) =>
      total +
      roster.parties.reduce((count, party) => count + party.partySize, 0),
    0,
  )
  const projectedHostNetKurus = rosters.reduce(
    (total, roster) =>
      total +
      roster.parties.reduce(
        (subtotal, party) =>
          subtotal + party.partySize * roster.table.hostNetPayoutKurus,
        0,
      ),
    0,
  )
  const certificationActive = isHostCertificationActive(
    certification,
    new Date(getServerTimeMilliseconds()),
  )

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CalendarClock}
          label={t('upcomingTables')}
          value={String(upcoming.length)}
        />
        <SummaryCard
          icon={ClipboardCheck}
          label={t('certifiedCapacity')}
          value={
            certificationActive && certification
              ? String(certification.certifiedTravelerCapacity)
              : t('unavailable')
          }
        />
        <SummaryCard
          icon={UsersRound}
          label={t('confirmedTravelers')}
          value={String(confirmedTravelers)}
        />
        <SummaryCard
          icon={CircleDollarSign}
          label={t('payouts')}
          value={formatTry(
            projectedHostNetKurus,
            locale === 'tr' ? 'tr-TR' : 'en-US',
          )}
        />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-3xl">{t('tables')}</CardTitle>
          <Button asChild>
            <Link href="/host/tables/new">{t('newTable')}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.map((table) => (
            <Link
              href={`/host/tables/${table.id}/edit`}
              key={table.id}
              className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-heading text-xl font-semibold">
                  {table.menuTitle}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatTableDate(table.startsAt, locale)} ·{' '}
                  {t('seatsAvailable', { count: table.availableSeats })}
                </p>
              </div>
              <Badge
                variant={table.status === 'draft' ? 'secondary' : 'outline'}
              >
                {t(`statuses.${table.status}`)}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="text-primary size-5" />
        <p className="font-heading mt-5 text-3xl font-semibold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{label}</p>
      </CardContent>
    </Card>
  )
}
