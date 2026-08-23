import { CalendarCheck, CheckCircle2, Link2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTableDate } from '@/lib/date'
import { listPublicTables } from '@/server/repositories/queries'

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Partner')
  const tables = (await listPublicTables()).slice(0, 3)
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={CalendarCheck}
          label={t('upcoming')}
          value={String(tables.length)}
        />
        <Metric icon={Link2} label={t('referrals')} value="SOFRA-DEMO" />
        <Metric icon={CheckCircle2} label={t('completed')} value="7" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('upcoming')}</CardTitle>
          <p className="text-muted-foreground text-sm">
            Only approved public-safe listing fields are shown.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {tables.map((table) => (
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
              <Badge variant="outline">Approved</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarCheck
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
