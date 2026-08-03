import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateTableForm } from '@/features/hosted-tables/create-table-form'
import { getMinimumLocalDateTime } from '@/server/time/clock'

export default async function NewHostedTablePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const minimumStartsAt = getMinimumLocalDateTime(7)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('newTable')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          The household chooses the complete menu. Saving creates a private
          draft; publication always requires Sofra approval.
        </p>
      </CardHeader>
      <CardContent>
        <CreateTableForm
          certifiedCapacity={6}
          minimumStartsAt={minimumStartsAt}
        />
      </CardContent>
    </Card>
  )
}
