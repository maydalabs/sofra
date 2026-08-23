import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { submitHostedTableAction } from '../../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { getCurrentActor } from '@/server/auth/current-actor'
import { findHostTableById } from '@/server/repositories/queries'

export default async function EditHostedTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ submitted?: string }>
}) {
  const { locale, id } = await params
  const query = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const actor = await getCurrentActor()
  if (!actor) notFound()
  const table = await findHostTableById(actor.id, id)
  if (!table) notFound()
  const editable =
    table.status === 'draft' || table.status === 'changes_requested'
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-3xl">{t('editDraft')}</CardTitle>
          <Badge>
            {query.submitted === '1'
              ? 'submitted'
              : table.status.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{table.menuTitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.submitted === '1' ? (
          <Alert>
            <AlertDescription>
              Submitted for Sofra approval. The table is not public and is now
              read-only for host review.
            </AlertDescription>
          </Alert>
        ) : null}
        {!editable ? (
          <Alert>
            <AlertDescription>
              This table is read-only while Sofra reviews or publishes it.
              Lifecycle changes go through the table service.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs">Complete menu</p>
            <p className="mt-1 font-medium">{table.menuDescription}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Approval status</p>
            <p className="mt-1 font-medium">
              {query.submitted === '1'
                ? 'submitted'
                : table.status.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Capacity</p>
            <p className="mt-1 font-medium">
              {table.proposedCapacity} proposed · {table.certifiedCapacity}{' '}
              certified
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Confirmed guests</p>
            <p className="mt-1 font-medium">
              {table.certifiedCapacity - table.availableSeats}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={submitHostedTableAction}>
            <input type="hidden" name="tableId" value={table.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button disabled={!editable || query.submitted === '1'}>
              {t('submit')}
            </Button>
          </form>
          {table.certifiedCapacity - table.availableSeats > 0 ? (
            <Button variant="outline" asChild>
              <Link href={`/host/tables/${table.id}/roster`}>
                {t('roster')}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
