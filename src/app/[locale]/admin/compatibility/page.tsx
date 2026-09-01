import { Salad, ShieldAlert } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { decideCompatibilityAction } from '@/app/[locale]/admin/actions'
import { EmptyState } from '@/components/empty-state'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatTableDate } from '@/lib/date'
import { listOperatorCompatibilityQueue } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

/**
 * The operator side of dietary compatibility.
 *
 * Hosts never see disclosure text — the roster excludes it by design — so the
 * operator reads it here, confirms with the household off-platform, and records
 * the outcome. Until that happens the booking's compatibility stays pending.
 */
export default async function CompatibilityQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ compat?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const { compat, error } = await searchParams
  const queue = await listOperatorCompatibilityQueue()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('compatibilityTitle')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          {t('compatibilityIntro')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>{t('confidentialDemoTitle')}</AlertTitle>
          <AlertDescription>{t('confidentialDemoBody')}</AlertDescription>
        </Alert>
        {compat === 'decided' ? (
          <Alert role="status">
            <AlertDescription>{t('compatDecidedNotice')}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{t('actionFailed')}</AlertDescription>
          </Alert>
        ) : null}

        {queue.length === 0 ? (
          <EmptyState
            icon={Salad}
            title={t('compatibilityEmptyTitle')}
            description={t('compatibilityEmptyBody')}
          />
        ) : (
          queue.map((entry) => (
            <div key={entry.bookingId} className="rounded-2xl border p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-heading text-2xl font-semibold">
                  {entry.tableLabel}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t('partyOf', { count: entry.partySize })} ·{' '}
                  {formatTableDate(entry.startsAt, locale)}
                </p>
              </div>
              <p className="bg-secondary mt-4 rounded-xl p-4 leading-7">
                {entry.disclosure}
              </p>
              <form
                action={decideCompatibilityAction}
                className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4"
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="bookingId" value={entry.bookingId} />
                <div className="min-w-64 flex-1 space-y-1">
                  <Label
                    htmlFor={`compat-reason-${entry.bookingId}`}
                    className="text-xs"
                  >
                    {t('compatPrivateReason')}
                  </Label>
                  <Input
                    id={`compat-reason-${entry.bookingId}`}
                    name="privateReason"
                    placeholder={t('optionalNotePlaceholder')}
                  />
                </div>
                <Button
                  type="submit"
                  name="decision"
                  value="accepted"
                  size="sm"
                >
                  {t('compatAccept')}
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="declined"
                  size="sm"
                  variant="outline"
                >
                  {t('compatDecline')}
                </Button>
              </form>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
