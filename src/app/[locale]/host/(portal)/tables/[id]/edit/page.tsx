import { CheckCircle2, Circle, Clock3, TriangleAlert } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { submitHostedTableAction } from '../../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getHostTableJourney,
  type HostJourneyStepState,
} from '@/features/hosted-tables/host-journey'
import { Link } from '@/i18n/navigation'
import { findHostTableById } from '@/server/repositories/queries'

import { requireHostPageActor } from '../../../authorize'

export default async function EditHostedTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ submission?: string }>
}) {
  const { locale, id } = await params
  const query = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const journeyT = await getTranslations('HostJourney')
  const actor = await requireHostPageActor(locale)
  const table = await findHostTableById(actor.id, id)
  if (!table) notFound()
  const editable =
    table.status === 'draft' || table.status === 'changes_requested'
  const journey = getHostTableJourney(table.status)
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-3xl">{t('editDraft')}</CardTitle>
          <Badge>{t(`statuses.${table.status}`)}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{table.menuTitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {query.submission === 'reviewed' ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription>{t('submissionReviewed')}</AlertDescription>
          </Alert>
        ) : null}
        {query.submission === 'unavailable' ? (
          <Alert>
            <TriangleAlert className="size-4" />
            <AlertDescription>{t('submissionUnavailable')}</AlertDescription>
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
            <p className="mt-1 font-medium">{t(`statuses.${table.status}`)}</p>
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
        <section aria-labelledby="host-journey-title">
          <div>
            <p className="eyebrow">{journeyT('eyebrow')}</p>
            <h2 id="host-journey-title" className="mt-2 text-3xl">
              {journeyT('title')}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {journeyT(`summaries.${table.status}`)}
            </p>
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-5">
            {journey.map((step) => (
              <li key={step.id} className="rounded-2xl border p-4">
                <HostJourneyIcon state={step.state} />
                <p className="mt-3 text-sm font-medium">
                  {journeyT(`steps.${step.id}`)}
                </p>
                <Badge
                  className="mt-3"
                  variant={
                    step.state === 'attention' ? 'destructive' : 'outline'
                  }
                >
                  {journeyT(`states.${step.state}`)}
                </Badge>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-wrap gap-3">
          <form action={submitHostedTableAction}>
            <input type="hidden" name="tableId" value={table.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button disabled={!editable}>{t('submit')}</Button>
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

function HostJourneyIcon({ state }: { state: HostJourneyStepState }) {
  const Icon =
    state === 'complete'
      ? CheckCircle2
      : state === 'current'
        ? Clock3
        : state === 'attention'
          ? TriangleAlert
          : Circle
  return (
    <Icon
      aria-hidden="true"
      className={
        state === 'attention'
          ? 'text-destructive size-4'
          : 'text-primary size-4'
      }
    />
  )
}
