import { LockKeyhole, MessageCircleMore, ShieldAlert, Star } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import {
  reviewPrivateFeedbackAction,
  reviewPublicExperienceAction,
  reviewSafetyReportAction,
} from './actions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Link } from '@/i18n/navigation'
import { findTravelerBookingById } from '@/server/repositories/queries'

import { requireTravelerPageActor } from '../../../authorize'

type FeedbackResult =
  'public_reviewed' | 'private_reviewed' | 'safety_reviewed' | 'unavailable'

export default async function BookingReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ feedback?: string }>
}) {
  const { locale, id } = await params
  const query = await searchParams
  const feedbackResult = parseFeedbackResult(query.feedback)
  setRequestLocale(locale)
  const t = await getTranslations('Feedback')
  const actor = await requireTravelerPageActor(locale)
  const booking = await findTravelerBookingById(actor.id, id)
  if (!booking || booking.status !== 'completed') notFound()

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-2 text-4xl font-medium">{booking.menuTitle}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {booking.householdName}
        </p>
      </div>

      <Alert>
        <MessageCircleMore className="size-4" />
        <AlertTitle>{t('separationTitle')}</AlertTitle>
        <AlertDescription>{t('separationBody')}</AlertDescription>
      </Alert>

      <FeedbackResultAlert result={feedbackResult} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-medium">
                {t('publicTitle')}
              </h2>
              <Badge variant="outline">
                <Star className="size-3" />
                {t('moderatedPublic')}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm leading-6">
              {t('publicIntro')}
            </p>
          </CardHeader>
          <CardContent>
            <form action={reviewPublicExperienceAction} className="space-y-5">
              <BookingFields bookingId={booking.id} locale={locale} />
              <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="public-rating">{t('rating')}</Label>
                  <Input
                    id="public-rating"
                    name="rating"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-title">{t('reviewTitle')}</Label>
                  <Input
                    id="public-title"
                    name="title"
                    minLength={5}
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-body">{t('publicBody')}</Label>
                <Textarea
                  id="public-body"
                  name="body"
                  rows={6}
                  minLength={30}
                  maxLength={2_000}
                  required
                />
              </div>
              <label className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  name="privacyAcknowledged"
                  className="accent-primary mt-1 size-4"
                  required
                />
                <span>{t('publicPrivacyAcknowledgment')}</span>
              </label>
              <p className="text-muted-foreground text-xs leading-5">
                {t('publicNote')}
              </p>
              <Button type="submit">{t('reviewPublicAction')}</Button>
            </form>
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
            <p className="text-muted-foreground text-sm leading-6">
              {t('privateIntro')}
            </p>
          </CardHeader>
          <CardContent>
            <form action={reviewPrivateFeedbackAction} className="space-y-5">
              <BookingFields bookingId={booking.id} locale={locale} />
              <div className="space-y-2">
                <Label htmlFor="private-body">{t('privateBody')}</Label>
                <Textarea
                  id="private-body"
                  name="body"
                  rows={8}
                  minLength={20}
                  maxLength={2_000}
                  required
                />
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                {t('privateNote')}
              </p>
              <Button type="submit" variant="outline">
                {t('reviewPrivateAction')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-start gap-4">
            <ShieldAlert className="text-destructive mt-1 size-5 shrink-0" />
            <div>
              <h2 className="font-heading text-3xl font-medium">
                {t('safetyTitle')}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {t('safetyBody')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>{t('notEmergencyTitle')}</AlertTitle>
            <AlertDescription>{t('notEmergencyBody')}</AlertDescription>
          </Alert>
          <form
            action={reviewSafetyReportAction}
            className="grid gap-5 lg:grid-cols-[12rem_1fr_auto] lg:items-end"
          >
            <BookingFields bookingId={booking.id} locale={locale} />
            <div className="space-y-2">
              <Label htmlFor="safety-severity">{t('severity')}</Label>
              <select
                id="safety-severity"
                name="severity"
                defaultValue="medium"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                required
              >
                <option value="low">{t('severities.low')}</option>
                <option value="medium">{t('severities.medium')}</option>
                <option value="high">{t('severities.high')}</option>
                <option value="critical">{t('severities.critical')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidential-report">
                {t('confidentialReport')}
              </Label>
              <Textarea
                id="confidential-report"
                name="confidentialReport"
                rows={5}
                minLength={20}
                maxLength={4_000}
                required
              />
            </div>
            <Button type="submit" variant="destructive">
              {t('reviewSafetyAction')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href={`/account/bookings/${booking.id}`}>{t('back')}</Link>
      </Button>
    </div>
  )
}

function parseFeedbackResult(
  value: string | undefined,
): FeedbackResult | undefined {
  return [
    'public_reviewed',
    'private_reviewed',
    'safety_reviewed',
    'unavailable',
  ].includes(value ?? '')
    ? (value as FeedbackResult)
    : undefined
}

function BookingFields({
  bookingId,
  locale,
}: {
  bookingId: string
  locale: string
}) {
  return (
    <>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="locale" value={locale} />
    </>
  )
}

async function FeedbackResultAlert({
  result,
}: {
  result: FeedbackResult | undefined
}) {
  if (!result) return null
  const t = await getTranslations('Feedback')
  const destructive = result === 'safety_reviewed' || result === 'unavailable'
  return (
    <Alert variant={destructive ? 'destructive' : 'default'}>
      {result === 'safety_reviewed' ? (
        <ShieldAlert className="size-4" />
      ) : (
        <MessageCircleMore className="size-4" />
      )}
      <AlertTitle>{t(`results.${result}.title`)}</AlertTitle>
      <AlertDescription>{t(`results.${result}.body`)}</AlertDescription>
    </Alert>
  )
}
