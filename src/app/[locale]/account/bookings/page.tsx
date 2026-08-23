import { CalendarSearch } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { listTravelerBookings } from '@/server/repositories/queries'

import { requireTravelerPageActor } from '../authorize'

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Account')
  const actor = await requireTravelerPageActor(locale)
  const bookings = await listTravelerBookings(actor.id)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('bookingDetails')}</CardTitle>
      </CardHeader>
      <CardContent className={bookings.length ? 'divide-y' : undefined}>
        {bookings.length ? (
          bookings.map((booking) => (
            <Link
              href={`/account/bookings/${booking.id}`}
              key={booking.id}
              className="hover:bg-secondary -mx-3 flex flex-col justify-between gap-3 rounded-xl px-3 py-5 transition-colors sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-heading text-xl font-semibold">
                  {booking.menuTitle}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatTableDate(booking.startsAt, locale)} ·{' '}
                  {booking.neighborhood}
                </p>
              </div>
              <Badge variant="outline">
                {booking.status.replace('_', ' ')}
              </Badge>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={CalendarSearch}
            title={t('emptyBookingsTitle')}
            description={t('emptyBookingsBody')}
          >
            <Button asChild>
              <Link href="/tables">{t('findAnotherTable')}</Link>
            </Button>
          </EmptyState>
        )}
      </CardContent>
    </Card>
  )
}
