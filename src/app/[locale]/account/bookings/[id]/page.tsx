import {
  Calendar,
  CheckCircle2,
  MapPin,
  ReceiptText,
  Users,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTry } from '@/features/pricing/pricing'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { getCurrentActor } from '@/server/auth/current-actor'
import { findTravelerBookingById } from '@/server/repositories/queries'

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Account')
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  const booking = await findTravelerBookingById(actor.id, id)
  if (!booking) notFound()

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-3xl">{booking.menuTitle}</CardTitle>
            <Badge>{booking.status.replace('_', ' ')}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {booking.householdName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-2xl border p-5 text-sm sm:grid-cols-2">
            <p className="flex gap-3">
              <Calendar className="text-primary size-4" />
              {formatTableDate(booking.startsAt, locale)}
            </p>
            <p className="flex gap-3">
              <MapPin className="text-primary size-4" />
              {booking.neighborhood} · exact address withheld
            </p>
            <p className="flex gap-3">
              <Users className="text-primary size-4" />
              Party of {booking.partySize} · {booking.partyType}
            </p>
            <p className="flex gap-3">
              <ReceiptText className="text-primary size-4" />
              {formatTry(
                booking.guestTotalKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}{' '}
              total
            </p>
          </div>
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertTitle>
              Compatibility: {booking.compatibilityStatus.replace('_', ' ')}
            </AlertTitle>
            <AlertDescription>
              Disclosure content remains in the private dietary record and does
              not appear here.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href={`/tables/${booking.tableSlug}`}>
                View public table
              </Link>
            </Button>
            {booking.status !== 'completed' ? (
              <Button variant="outline">{t('cancel')}</Button>
            ) : (
              <>
                <Button asChild>
                  <Link href={`/account/bookings/${booking.id}/review`}>
                    {t('review')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/account/bookings/${booking.id}/review`}>
                    {t('privateFeedback')}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-2xl">Privacy boundary</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm leading-6">
          <p>The approximate neighborhood is visible now.</p>
          <p>
            Arrival instructions remain separate until the appropriate confirmed
            stage.
          </p>
          <p>Other travelers never see your name or dietary needs.</p>
        </CardContent>
      </Card>
    </div>
  )
}
