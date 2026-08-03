import {
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  UsersRound,
} from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPrivateDemoTables } from '@/features/hosted-tables/demo-tables'
import { formatTry } from '@/features/pricing/pricing'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'

export default async function HostDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const tables = getPrivateDemoTables().filter(
    (table) => table.householdId === 'household-ayse-levent',
  )
  const upcoming = tables.filter(
    (table) => !['completed', 'archived', 'cancelled'].includes(table.status),
  )

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CalendarClock}
          label="Upcoming tables"
          value={String(upcoming.length)}
        />
        <SummaryCard
          icon={ClipboardCheck}
          label="Certified capacity"
          value="6"
        />
        <SummaryCard icon={UsersRound} label="Confirmed travelers" value="3" />
        <SummaryCard
          icon={CircleDollarSign}
          label={t('payouts')}
          value={formatTry(360_000, locale === 'tr' ? 'tr-TR' : 'en-US')}
        />
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-3xl">{t('tables')}</CardTitle>
          <Button asChild>
            <Link href="/host/tables/new">{t('newTable')}</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.map((table) => (
            <Link
              href={`/host/tables/${table.id}/edit`}
              key={table.id}
              className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-heading text-xl font-semibold">
                  {table.menuTitle}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatTableDate(table.startsAt, locale)} ·{' '}
                  {table.availableSeats} seats available
                </p>
              </div>
              <Badge
                variant={table.status === 'draft' ? 'secondary' : 'outline'}
              >
                {table.status.replace('_', ' ')}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <Icon className="text-primary size-5" />
        <p className="font-heading mt-5 text-3xl font-semibold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs">{label}</p>
      </CardContent>
    </Card>
  )
}
