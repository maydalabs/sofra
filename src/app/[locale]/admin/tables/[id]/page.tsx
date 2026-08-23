import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { approveTableAction, requestTableChangesAction } from '../../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
                ? 'approved'
                : query.changes === '1'
                  ? 'changes requested'
                  : table.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {table.householdName} · {table.neighborhood}
          </p>
        </CardHeader>
        <CardContent className="space-y-7">
          {query.approved === '1' ? (
            <Alert>
              <AlertDescription>
                Table approved through the server service and recorded in the
                demo audit log. Publication remains a separate operator
                transition.
              </AlertDescription>
            </Alert>
          ) : null}
          {query.changes === '1' ? (
            <Alert>
              <AlertDescription>
                Changes requested and audit entry created. The host can revise
                before resubmitting.
              </AlertDescription>
            </Alert>
          ) : null}
          <Alert>
            <AlertDescription>
              Private address reference is intentionally not rendered in the
              approval interface. Address verification is a separate privileged
              workflow.
            </AlertDescription>
          </Alert>
          <section>
            <h2 className="text-2xl">Complete menu</h2>
            <p className="text-muted-foreground mt-2 leading-7">
              {table.menuDescription}
            </p>
          </section>
          <div className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
            <Detail
              label="Proposed / certified capacity"
              value={`${table.proposedCapacity} / ${table.certifiedCapacity}`}
            />
            <Detail
              label="Host net / guest total"
              value={`${formatTry(table.hostNetPayoutKurus)} / ${formatTry(table.guestPriceKurus)}`}
            />
            <Detail
              label="Household participants"
              value={table.expectedHouseholdParticipants}
            />
            <Detail
              label="Accessibility"
              value={table.accessibilityInformation}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Review action</CardTitle>
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
            <Input name="reason" placeholder="Reason required" required />
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
            Every action uses server-side permission checks and creates an audit
            entry.
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
