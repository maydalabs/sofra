import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTry } from '@/features/pricing/pricing'
import { listOperatorBookings } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

export default async function AdminBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const bookings = await listOperatorBookings()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('bookings')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('bookingsIntro')}</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bookingColumn')}</TableHead>
              <TableHead>{t('tableColumn')}</TableHead>
              <TableHead>{t('partyColumn')}</TableHead>
              <TableHead>{t('totalColumn')}</TableHead>
              <TableHead>{t('statusColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">
                  {booking.id}
                </TableCell>
                <TableCell>{booking.menuTitle}</TableCell>
                <TableCell>{booking.partySize}</TableCell>
                <TableCell>
                  {formatTry(
                    booking.guestTotalKurus,
                    locale === 'tr' ? 'tr-TR' : 'en-US',
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`bookingStatuses.${booking.status}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
