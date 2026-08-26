import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { ApplicationDecisionPanel } from '@/components/admin/application-decision-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { findOperatorHostApplicationById } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../../authorize'

export default async function HostAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ decision?: string; error?: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const { decision, error } = await searchParams
  const application = await findOperatorHostApplicationById(id)
  if (!application) notFound()
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">
            {application.householdName ?? application.applicantName}
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {t('restrictedApplication')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
            <Detail label={t('applicant')} value={application.applicantName} />
            <Detail
              label={t('householdStructure')}
              value={application.householdStructure ?? t('householdPending')}
            />
            <Detail
              label={t('status')}
              value={t(`applicationStatuses.${application.status}`)}
            />
            <Detail
              label={t('submitted')}
              value={
                application.submittedAt
                  ? t('applicationReceived')
                  : t('notSubmitted')
              }
            />
          </div>
          <div>
            <h2 className="text-2xl">{t('hostingMotivation')}</h2>
            <p className="text-muted-foreground mt-2 leading-7">
              {application.motivation}
            </p>
          </div>
          <div>
            <h2 className="text-2xl">{t('hostingPlan')}</h2>
            <p className="text-muted-foreground mt-2 leading-7">
              {application.hostingPlan}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('assessments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicationDecisionPanel
            locale={locale}
            applicationId={application.id}
            status={application.status}
            outcome={decision}
            error={error}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
