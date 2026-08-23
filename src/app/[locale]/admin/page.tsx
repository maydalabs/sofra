import {
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  Inbox,
  ShieldCheck,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Link } from '@/i18n/navigation'
import { getOperatorOverview } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from './authorize'

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const { applications, tables, incidents, payouts, auditEvents } =
    await getOperatorOverview()
  const pendingApplications = applications.filter((application) =>
    ['submitted', 'under_review', 'changes_requested'].includes(
      application.status,
    ),
  )
  const submittedTables = tables.filter((table) => table.status === 'submitted')
  const openIncidents = incidents.filter(
    (incident) => !['resolved', 'closed'].includes(incident.status),
  )
  const metrics = [
    {
      icon: ClipboardList,
      value: String(pendingApplications.length),
      label: t('applications'),
    },
    {
      icon: CalendarCheck,
      value: String(submittedTables.length),
      label: t('tables'),
    },
    {
      icon: AlertTriangle,
      value: String(openIncidents.length),
      label: t('incidents'),
    },
    {
      icon: CircleDollarSign,
      value: String(payouts.length),
      label: t('payouts'),
    },
    {
      icon: ShieldCheck,
      value: String(auditEvents.length),
      label: t('audit'),
    },
  ]
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ icon: Icon, value, label }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className="text-primary size-5" />
              <p className="font-heading mt-5 text-4xl font-semibold">
                {value}
              </p>
              <p className="text-muted-foreground text-xs">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('needsAttention')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingApplications.length ||
          submittedTables.length ||
          openIncidents.length ? (
            <>
              {pendingApplications[0] ? (
                <AdminQueueLink
                  href={`/admin/host-applications/${pendingApplications[0].id}`}
                  title={t('applicationTitle', {
                    name:
                      pendingApplications[0].householdName ??
                      pendingApplications[0].applicantName,
                  })}
                  note={t('assessmentQueue', {
                    status: t(
                      `applicationStatuses.${pendingApplications[0].status}`,
                    ),
                  })}
                  badge={t('hostReview')}
                />
              ) : null}
              {submittedTables[0] ? (
                <AdminQueueLink
                  href={`/admin/tables/${submittedTables[0].id}`}
                  title={submittedTables[0].menuTitle}
                  note={t('tableReady')}
                  badge={t('tableReview')}
                />
              ) : null}
              {openIncidents[0] ? (
                <AdminQueueLink
                  href="/admin/incidents"
                  title={t('incidentTitle', {
                    severity: t(`severities.${openIncidents[0].severity}`),
                  })}
                  note={
                    openIncidents[0].payoutHeld
                      ? t('incidentPayoutHeld')
                      : t('incidentPayoutClear')
                  }
                  badge={t('safety')}
                />
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title={t('emptyAttentionTitle')}
              description={t('emptyAttentionBody')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AdminQueueLink({
  href,
  title,
  note,
  badge,
}: {
  href: string
  title: string
  note: string
  badge: string
}) {
  return (
    <Link
      href={href}
      className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
    >
      <div>
        <p className="font-heading text-xl font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </div>
      <Badge variant="outline">{badge}</Badge>
    </Link>
  )
}
