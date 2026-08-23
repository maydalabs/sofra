import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { approveTableAction, requestTableChangesAction } from '../../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatTry } from '@/features/pricing/pricing'
import { findOperatorTableReviewById } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../../authorize'

export default async function AdminTableDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ approved?: string; changes?: string }>
}) {
  const { locale, id } = await params
  const query = await searchParams
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const tableT = await getTranslations('HostPortal')
  const table = await findOperatorTableReviewById(id)
  if (!table) notFound()
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between gap-3">
            <CardTitle className="text-3xl">{table.menuTitle}</CardTitle>
            <Badge>
              {query.approved === '1'
                ? tableT('statuses.approved')
                : query.changes === '1'
                  ? tableT('statuses.changes_requested')
                  : tableT(`statuses.${table.status}`)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {table.householdName} · {table.neighborhood}
          </p>
        </CardHeader>
        <CardContent className="space-y-7">
          {query.approved === '1' ? (
            <Alert>
              <AlertDescription>{t('tableApprovedNotice')}</AlertDescription>
            </Alert>
          ) : null}
          {query.changes === '1' ? (
            <Alert>
              <AlertDescription>{t('changesRequestedNotice')}</AlertDescription>
            </Alert>
          ) : null}
          <Alert>
            <AlertDescription>{t('privateAddressNotice')}</AlertDescription>
          </Alert>
          <section>
            <h2 className="text-2xl">{t('completeMenu')}</h2>
            <p className="text-muted-foreground mt-2 leading-7">
              {table.menuDescription}
            </p>
          </section>
          <div className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
            <Detail
              label={t('capacityReview')}
              value={`${table.proposedCapacity} / ${table.certifiedCapacity}`}
            />
            <Detail
              label={t('priceReview')}
              value={`${formatTry(
                table.hostNetPayoutKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )} / ${formatTry(
                table.guestPriceKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}`}
            />
            <Detail
              label={t('householdParticipants')}
              value={table.expectedHouseholdParticipants}
            />
            <Detail
              label={t('accessibility')}
              value={table.accessibilityInformation}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('reviewAction')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={approveTableAction}>
            <input type="hidden" name="tableId" value={table.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button
              className="w-full"
              disabled={
                table.status !== 'submitted' ||
                Boolean(query.approved || query.changes)
              }
            >
              {t('approve')}
            </Button>
          </form>
          <form action={requestTableChangesAction} className="space-y-3">
            <input type="hidden" name="tableId" value={table.id} />
            <input type="hidden" name="locale" value={locale} />
            <Label htmlFor="change-reason">{t('reason')}</Label>
            <Input
              id="change-reason"
              name="reason"
              placeholder={t('reasonPlaceholder')}
              required
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={
                table.status !== 'submitted' ||
                Boolean(query.approved || query.changes)
              }
            >
              {t('requestChanges')}
            </Button>
          </form>
          <p className="text-muted-foreground text-xs leading-5">
            {t('actionAuditNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-sm leading-6 font-medium">{value}</p>
    </div>
  )
}
