import type { LucideIcon } from 'lucide-react'
import {
  CalendarSearch,
  CheckCircle2,
  Link2,
  MousePointerClick,
  TicketCheck,
  UsersRound,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PartnerReferralActivity } from '@/features/partners/referrals'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { getPartnerReferralOverviews } from '@/server/repositories/partner/queries'
import { listPublicTables } from '@/server/repositories/queries'

import { requirePartnerPageActor } from './authorize'

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requirePartnerPageActor(locale)
  const t = await getTranslations('Partner')
  const [organizations, publicTables] = await Promise.all([
    getPartnerReferralOverviews(),
    listPublicTables(),
  ])
  const upcomingTables = publicTables.slice(0, 3)

  return (
    <div className="space-y-8">
      <Card className="bg-secondary/45">
        <CardContent className="grid gap-5 p-6 md:grid-cols-[auto_1fr] md:items-start">
          <div className="bg-background flex size-11 items-center justify-center rounded-full border">
            <Link2 className="text-primary size-5" />
          </div>
          <div>
            <p className="eyebrow">{t('scopeEyebrow')}</p>
            <h2 className="font-heading mt-2 text-2xl font-semibold">
              {t('scopeTitle')}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
              {t('scopeBody')}
            </p>
          </div>
        </CardContent>
      </Card>

      {organizations.length ? (
        organizations.map((organization) => (
          <section key={organization.organizationId} className="space-y-5">
            <Card>
              <CardHeader className="gap-4 border-b sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-3xl">
                      {organization.organizationName}
                    </CardTitle>
                    <Badge variant="outline">
                      {t(
                        `organizationStatus.${organization.organizationStatus}`,
                      )}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t('organizationBody')}
                  </p>
                </div>
                <div className="bg-muted rounded-xl px-4 py-3 sm:text-right">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    {t('referralCode')}
                  </p>
                  <code className="mt-1 block text-base font-semibold">
                    {organization.organizationCode}
                  </code>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-1 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={MousePointerClick}
                  label={t('attributedVisits')}
                  value={String(organization.attributedVisits)}
                />
                <Metric
                  icon={TicketCheck}
                  label={t('attributedBookings')}
                  value={String(organization.attributedBookings)}
                />
                <Metric
                  icon={CheckCircle2}
                  label={t('completed')}
                  value={String(organization.completedBookings)}
                />
                <Metric
                  icon={UsersRound}
                  label={t('completedTravelers')}
                  value={String(organization.completedTravelers)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{t('activityTitle')}</CardTitle>
                <p className="text-muted-foreground text-sm leading-6">
                  {t('activityBody')}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {organization.activity.length ? (
                  organization.activity.map((activity) => (
                    <ReferralActivityRow
                      key={activity.id}
                      activity={activity}
                      locale={locale}
                      stageLabel={t(`stages.${activity.stage}`)}
                      landingLabel={t('landingOnly')}
                      tableLabel={t('viewTable')}
                      travelersLabel={t('travelers', {
                        count: activity.partySize ?? 0,
                      })}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground rounded-2xl border border-dashed p-5 text-sm">
                    {t('emptyActivity')}
                  </p>
                )}
              </CardContent>
            </Card>
          </section>
        ))
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="font-heading text-xl font-semibold">
              {t('emptyOrganizationTitle')}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('emptyOrganizationBody')}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('upcoming')}</CardTitle>
          <p className="text-muted-foreground text-sm">{t('upcomingBody')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingTables.length ? (
            upcomingTables.map((table) => (
              <div
                key={table.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-heading text-xl font-semibold">
                    {table.menuTitle}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatTableDate(table.startsAt, locale)} ·{' '}
                    {table.neighborhood}
                  </p>
                </div>
                <Badge variant="outline">{t('approved')}</Badge>
              </div>
            ))
          ) : (
            <EmptyState
              icon={CalendarSearch}
              title={t('emptyUpcomingTitle')}
              description={t('emptyUpcomingBody')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReferralActivityRow({
  activity,
  locale,
  stageLabel,
  landingLabel,
  tableLabel,
  travelersLabel,
}: {
  activity: PartnerReferralActivity
  locale: string
  stageLabel: string
  landingLabel: string
  tableLabel: string
  travelersLabel: string
}) {
  return (
    <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{stageLabel}</Badge>
          <span className="text-muted-foreground text-xs">
            {activity.referralCode}
          </span>
        </div>
        <p className="font-heading mt-3 text-lg font-semibold">
          {activity.menuTitle ?? landingLabel}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {formatTableDate(activity.landedAt, locale)}
          {activity.neighborhood ? ` · ${activity.neighborhood}` : ''}
          {activity.partySize ? ` · ${travelersLabel}` : ''}
        </p>
      </div>
      {activity.tableSlug ? (
        <Link
          href={`/tables/${activity.tableSlug}`}
          className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
        >
          {tableLabel}
        </Link>
      ) : null}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="bg-muted/45 rounded-2xl p-4">
      <Icon className="text-primary size-5" />
      <p className="font-heading mt-5 text-3xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  )
}
