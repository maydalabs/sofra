import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPrivateDemoTables } from '@/features/hosted-tables/demo-tables'
import { Link } from '@/i18n/navigation'
import { formatTableDate } from '@/lib/date'

export default async function TableApprovalQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  const submitted = getPrivateDemoTables().filter(
    (table) => table.status === 'submitted',
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('tables')}</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted.map((table) => (
          <Link
            key={table.id}
            href={`/admin/tables/${table.id}`}
            className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center"
          >
            <div>
              <p className="font-heading text-2xl font-semibold">
                {table.menuTitle}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {table.householdName} ·{' '}
                {formatTableDate(table.startsAt, locale)}
              </p>
            </div>
            <Badge>Submitted</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
