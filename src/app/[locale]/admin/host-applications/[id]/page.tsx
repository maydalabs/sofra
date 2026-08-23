import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { findOperatorHostApplicationById } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../../authorize'

export default async function HostAssessmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
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
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{t('assessmentUnavailableTitle')}</AlertTitle>
            <AlertDescription id="assessment-preview-note">
              {t('assessmentUnavailableBody')}
            </AlertDescription>
          </Alert>
          <form
            aria-describedby="assessment-preview-note"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="notes">{t('privateAssessmentNotes')}</Label>
              <Textarea
                id="notes"
                rows={6}
                placeholder={t('assessmentPlaceholder')}
                readOnly
              />
            </div>
            <Button type="button" className="w-full" disabled>
              {t('saveAssessmentUnavailable')}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled>
              {t('certifyUnavailable')}
            </Button>
          </form>
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
