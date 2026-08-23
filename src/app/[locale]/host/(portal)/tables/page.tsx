import { CalendarPlus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { listHostTables } from '@/server/repositories/queries'

import { requireHostPageActor } from '../authorize'

export default async function HostTablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const actor = await requireHostPageActor(locale)
  const tables = await listHostTables(actor.id)
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-3xl">{t('tables')}</CardTitle>
        <Button asChild>
          <Link href="/host/tables/new">{t('newTable')}</Link>
        </Button>
      </CardHeader>
      <CardContent className={tables.length ? 'divide-y' : undefined}>
        {tables.length ? (
          tables.map((table) => (
            <Link
              key={table.id}
              href={`/host/tables/${table.id}/edit`}
              className="hover:bg-secondary -mx-3 flex flex-col justify-between gap-3 rounded-xl px-3 py-5 transition-colors sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-heading text-xl font-semibold">
                  {table.menuTitle}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatTableDate(table.startsAt, locale)} ·{' '}
                  {t('capacitySummary', {
                    proposed: table.proposedCapacity,
                    certified: table.certifiedCapacity,
                  })}
                </p>
              </div>
              <Badge variant="outline">{t(`statuses.${table.status}`)}</Badge>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title={t('emptyTablesTitle')}
            description={t('emptyTablesBody')}
          >
            <Button asChild>
              <Link href="/host/tables/new">{t('newTable')}</Link>
            </Button>
          </EmptyState>
        )}
      </CardContent>
    </Card>
  )
}
