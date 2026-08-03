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
import { getDemoBookings } from '@/features/bookings/demo-bookings'
import { formatTry } from '@/features/pricing/pricing'

export default async function AdminBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('bookings')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Operational status without dietary text or additional-guest names.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getDemoBookings().map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">
                  {booking.id}
                </TableCell>
                <TableCell>{booking.menuTitle}</TableCell>
                <TableCell>{booking.partySize}</TableCell>
                <TableCell>{formatTry(booking.guestTotalKurus)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{booking.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
