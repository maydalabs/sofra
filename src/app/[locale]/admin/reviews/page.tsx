import { MessageSquareText, Star } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { moderateReviewAction } from '@/app/[locale]/admin/actions'
import { EmptyState } from '@/components/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatTableDate } from '@/lib/date'
import { listOperatorPendingReviews } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

/**
 * Review moderation. Nothing a traveller writes becomes public until it is
 * published here; a rejected review is kept and simply never publishes.
 */
export default async function ReviewModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ moderation?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const { moderation, error } = await searchParams
  const reviews = await listOperatorPendingReviews()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('reviewsTitle')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('reviewsIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {moderation === 'done' ? (
          <Alert role="status">
            <AlertDescription>{t('reviewModeratedNotice')}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{t('actionFailed')}</AlertDescription>
          </Alert>
        ) : null}

        {reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={t('reviewsEmptyTitle')}
            description={t('reviewsEmptyBody')}
          />
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-heading text-2xl font-semibold">
                  {review.title ?? review.tableLabel}
                </p>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  {review.rating !== null ? (
                    <>
                      <Star className="size-4" aria-hidden="true" />
                      {review.rating}/5 ·{' '}
                    </>
                  ) : null}
                  {formatTableDate(review.submittedAt, locale)}
                </p>
              </div>
              <p className="text-muted-foreground text-sm">
                {review.tableLabel}
              </p>
              <p className="bg-secondary mt-4 rounded-xl p-4 leading-7">
                {review.body}
              </p>
              <form
                action={moderateReviewAction}
                className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="reviewId" value={review.id} />
                <div className="min-w-64 flex-1 space-y-1">
                  <Label
                    htmlFor={`review-reason-${review.id}`}
                    className="text-xs"
                  >
                    {t('reason')}
                  </Label>
                  <Input
                    id={`review-reason-${review.id}`}
                    name="reason"
                    placeholder={t('optionalNotePlaceholder')}
                  />
                </div>
                <Button type="submit" name="decision" value="publish" size="sm">
                  {t('reviewPublish')}
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="reject"
                  size="sm"
                  variant="outline"
                >
                  {t('reviewReject')}
                </Button>
              </form>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
