import {
  CalendarCheck,
  CalendarSearch,
  History,
  LockKeyhole,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { listTravelerBookings } from '@/server/repositories/queries'

import { requireTravelerPageActor } from './authorize'

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Account')
  const actor = await requireTravelerPageActor(locale)
  const bookings = await listTravelerBookings(actor.id)
  const upcoming = bookings.filter((booking) => booking.status !== 'completed')
  const past = bookings.filter((booking) => booking.status === 'completed')
  const privateDisclosures = bookings.filter(
    (booking) => booking.compatibilityStatus !== 'not_required',
  )

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={CalendarCheck}
          label={t('upcoming')}
          value={String(upcoming.length)}
        />
        <MetricCard
          icon={History}
          label={t('past')}
          value={String(past.length)}
        />
        <MetricCard
          icon={LockKeyhole}
          label={t('privateDisclosures')}
          value={String(privateDisclosures.length)}
        />
      </div>
      <Card>
        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-3xl">{t('upcoming')}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tables">{t('findAnotherTable')}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length ? (
            upcoming.map((booking) => (
              <Link
                href={`/account/bookings/${booking.id}`}
                key={booking.id}
                className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-heading text-xl font-semibold">
                    {booking.menuTitle}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {booking.householdName} ·{' '}
                    {formatTableDate(booking.startsAt, locale)}
                  </p>
                </div>
                <Badge
                  variant={
                    booking.status === 'confirmed' ? 'default' : 'secondary'
                  }
                >
                  {booking.status.replace('_', ' ')}
                </Badge>
              </Link>
            ))
          ) : (
            <EmptyState
              icon={CalendarSearch}
              title={t('emptyUpcomingTitle')}
              description={t('emptyUpcomingBody')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarCheck
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="text-primary size-5" />
        <p className="font-heading mt-5 text-4xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </CardContent>
    </Card>
  )
}
