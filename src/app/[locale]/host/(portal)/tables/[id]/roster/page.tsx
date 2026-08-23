import {
  CalendarClock,
  CheckCircle2,
  LockKeyhole,
  UsersRound,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import {
  findHostTableById,
  listHostRoster,
} from '@/server/repositories/queries'

import { requireHostPageActor } from '../../../authorize'

export default async function HostRosterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Roster')
  const actor = await requireHostPageActor(locale)
  const table = await findHostTableById(actor.id, id)
  if (!table) notFound()
  const roster = await listHostRoster(actor.id, table.id)
  const travelerCount = roster.reduce(
    (total, party) => total + party.partySize,
    0,
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{t('eyebrow')}</p>
              <CardTitle className="mt-2 text-3xl">{table.menuTitle}</CardTitle>
              <p className="text-muted-foreground mt-2 text-sm">
                {formatTableDate(table.startsAt, locale)}
              </p>
            </div>
            <Badge>{t(`tableStatuses.${table.status}`)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary
              icon={UsersRound}
              label={t('travelers')}
              value={String(travelerCount)}
            />
            <Summary
              icon={UsersRound}
              label={t('seatsOpen')}
              value={String(table.availableSeats)}
            />
            <Summary
              icon={CalendarClock}
              label={t('lock')}
              value={formatTableDate(table.rosterLockAt, locale)}
            />
          </div>
          <Alert>
            <LockKeyhole className="size-4" />
            <AlertTitle>{t('privacyTitle')}</AlertTitle>
            <AlertDescription>{t('privacyBody')}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-3xl font-medium">{t('parties')}</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {roster.length ? (
            roster.map((party) => (
              <div
                key={party.bookingId}
                className="grid gap-4 rounded-2xl border p-5 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-heading text-xl font-semibold">
                    {t('confirmedParty')}
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    {party.bookingId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Badge variant="outline">
                    {t('partySize', { count: party.partySize })}
                  </Badge>
                  <Badge variant="outline">
                    {t(`bookingStatuses.${party.bookingStatus}`)}
                  </Badge>
                  <Badge variant="secondary">
                    {t(`compatibility.${party.compatibilityStatus}`)}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground rounded-2xl border p-5 text-sm">
              {t('empty')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-heading text-3xl font-medium">
            {t('checklistTitle')}
          </h2>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(['menu', 'participation', 'welcome', 'tea'] as const).map(
            (item) => (
              <p
                key={item}
                className="flex gap-3 rounded-2xl border p-4 text-sm leading-6"
              >
                <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                {t(`checklist.${item}`)}
              </p>
            ),
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href={`/host/tables/${table.id}/edit`}>{t('back')}</Link>
      </Button>
    </div>
  )
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border p-4">
      <Icon className="text-primary size-4" />
      <p className="font-heading mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  )
}
