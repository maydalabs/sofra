import { NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'
import { notFound } from 'next/navigation'

import { simulateBookingAction } from './actions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookingForm } from '@/features/bookings/booking-form'
import { developmentPolicy } from '@/features/policy/config'
import { formatTableDate } from '@/lib/date'
import { findPublicTableBySlug } from '@/server/repositories/queries'

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const table = await findPublicTableBySlug(slug)
  if (!table || table.status === 'roster_locked') notFound()
  const [t, messages] = await Promise.all([
    getTranslations('Booking'),
    getMessages(),
  ])

  return (
    <div className="container-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-4 text-5xl font-medium tracking-tight">
          {t('title', { menuTitle: table.menuTitle })}
        </h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline">{table.householdName}</Badge>
          <Badge variant="outline">
            {formatTableDate(table.startsAt, locale)}
          </Badge>
          <Badge variant="outline">{table.neighborhood}</Badge>
        </div>
        <Card className="bg-card/90 mt-8">
          <CardHeader>
            <CardTitle className="text-3xl">
              {t('reservationDetails')}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {t('reservationIntro')}
            </p>
          </CardHeader>
          <CardContent>
            <NextIntlClientProvider
              messages={{ Booking: messages.Booking, Common: messages.Common }}
            >
              <BookingForm
                table={{
                  slug: table.slug,
                  format: table.format,
                  availableSeats: table.availableSeats,
                  guestPriceKurus: table.guestPriceKurus,
                  maximumSharedPartySize:
                    developmentPolicy.maximumSharedBookingPartySize,
                }}
                locale={locale}
                action={simulateBookingAction}
              />
            </NextIntlClientProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
