import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'

export default async function HostApplicationQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('applications')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          href="/admin/host-applications/demo-application"
          className="hover:bg-secondary flex flex-col justify-between gap-3 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-heading text-2xl font-semibold">
              Selin & Derya household
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Parent and adult child · Üsküdar demo cluster · submitted
            </p>
          </div>
          <Badge>Awaiting review</Badge>
        </Link>
      </CardContent>
    </Card>
  )
}
