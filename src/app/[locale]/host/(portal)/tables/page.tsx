import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'
import { getCurrentActor } from '@/server/auth/current-actor'
import { listHostTables } from '@/server/repositories/queries'

export default async function HostTablesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  const tables = await listHostTables(actor.id)
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-3xl">{t('tables')}</CardTitle>
        <Button asChild>
          <Link href="/host/tables/new">{t('newTable')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="divide-y">
        {tables.map((table) => (
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
                {table.proposedCapacity}/{table.certifiedCapacity}{' '}
                proposed/certified
              </p>
            </div>
            <Badge variant="outline">{table.status.replace('_', ' ')}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
