import { LockKeyhole, MessageCircleMore, ShieldAlert, Star } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { getCurrentActor } from '@/server/auth/current-actor'
import { getDemoCompletedFeedback } from '@/server/demo/feedback'
import { findTravelerBookingById } from '@/server/repositories/queries'

export default async function BookingReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Feedback')
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  const booking = await findTravelerBookingById(actor.id, id)
  const feedback = getDemoCompletedFeedback(id)
  if (!booking || booking.status !== 'completed' || !feedback) notFound()

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h2 className="mt-2 text-4xl font-medium">{booking.menuTitle}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {booking.householdName}
        </p>
      </div>
      <Alert>
        <MessageCircleMore className="size-4" />
        <AlertTitle>{t('separationTitle')}</AlertTitle>
        <AlertDescription>{t('separationBody')}</AlertDescription>
      </Alert>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-medium">
                {t('publicTitle')}
              </h2>
              <Badge>{t('published')}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="flex gap-1"
              aria-label={t('ratingLabel', {
                rating: feedback.publicReview.rating,
              })}
            >
              {Array.from(
                { length: feedback.publicReview.rating },
                (_, index) => (
                  <Star
                    key={index}
                    className="text-primary fill-primary size-4"
                  />
                ),
              )}
            </div>
            <h3 className="mt-5 text-2xl">{feedback.publicReview.title}</h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {feedback.publicReview.body}
            </p>
            <p className="text-muted-foreground mt-5 text-xs">
              {t('publicNote')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-medium">
                {t('privateTitle')}
              </h2>
              <Badge variant="secondary">
                <LockKeyhole className="size-3" />
                {t('operationsOnly')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-7">
              {feedback.privateFeedback.body}
            </p>
            <p className="text-muted-foreground mt-5 text-xs">
              {t('privateNote')}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-destructive/20">
        <CardContent className="flex gap-4 p-6">
          <ShieldAlert className="text-destructive mt-1 size-5 shrink-0" />
          <div>
            <h3 className="text-xl">{t('safetyTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {t('safetyBody')}
            </p>
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" asChild>
        <Link href={`/account/bookings/${booking.id}`}>{t('back')}</Link>
      </Button>
    </div>
  )
}
