import { ShieldAlert } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { IncidentTriageForm } from '@/components/admin/incident-triage-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { listOperatorIncidents } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

export default async function IncidentQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ triaged?: string; error?: string }>
}) {
  const { locale } = await params
  const { triaged, error } = await searchParams
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const incidents = await listOperatorIncidents()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('incidents')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>{t('confidentialDemoTitle')}</AlertTitle>
          <AlertDescription>{t('confidentialDemoBody')}</AlertDescription>
        </Alert>
        {triaged === '1' ? (
          <Alert role="status">
            <AlertDescription>{t('triagedNotice')}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{t('actionFailed')}</AlertDescription>
          </Alert>
        ) : null}
        {incidents.map((incident) => (
          <div key={incident.id} className="rounded-2xl border p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-heading text-2xl font-semibold">
                  {t('incidentHeading', {
                    severity: t(`severities.${incident.severity}`),
                  })}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('restrictedReport')} ·{' '}
                  {incident.bookingId ?? t('noLinkedBooking')}
                </p>
              </div>
              <Badge variant="destructive">
                {t(`incidentStatuses.${incident.status}`)} ·{' '}
                {incident.payoutHeld ? t('payoutHeld') : t('noPayoutHold')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-5 text-sm leading-6">
              {incident.confidentialReport}
            </p>
            <IncidentTriageForm
              locale={locale}
              incidentId={incident.id}
              status={incident.status}
            />
            {incident.relatedPayoutId ? (
              <Button variant="outline" className="mt-5" asChild>
                <Link href="/admin/payouts">{t('reviewRelatedPayout')}</Link>
              </Button>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
