import { Inbox } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Link } from '@/i18n/navigation'
import { listOperatorHostApplications } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

export default async function HostApplicationQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const applications = await listOperatorHostApplications()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('applications')}</CardTitle>
      </CardHeader>
      <CardContent>
        {applications.length ? (
          <div className="space-y-3">
            {applications.map((application) => (
              <Link
                key={application.id}
                href={`/admin/host-applications/${application.id}`}
                className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-heading text-2xl font-semibold">
                    {application.householdName ?? application.applicantName}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {application.householdStructure ?? t('householdPending')} ·{' '}
                    {application.status}
                  </p>
                </div>
                <Badge>{t('awaitingReview')}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title={t('emptyApplicationsTitle')}
            description={t('emptyApplicationsBody')}
          />
        )}
      </CardContent>
    </Card>
  )
}
