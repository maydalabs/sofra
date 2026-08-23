import { ShieldAlert } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default async function IncidentQueuePage({
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
        <CardTitle className="text-3xl">{t('incidents')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Confidential operator-only demonstration</AlertTitle>
          <AlertDescription>
            This content is rendered only after server authorization. It is
            absent from public fixtures, analytics, and host/traveler pages.
          </AlertDescription>
        </Alert>
        <div className="rounded-2xl border p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="font-heading text-2xl font-semibold">
                Arrival-boundary concern
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Fictional report · booking-demo-completed
              </p>
            </div>
            <Badge variant="destructive">Open · payout held</Badge>
          </div>
          <p className="text-muted-foreground mt-5 text-sm leading-6">
            The full confidential report would appear here for authorized
            operators only. This fixture demonstrates separation without
            describing a real event or person.
          </p>
          <Button variant="outline" className="mt-5" asChild>
            <Link href="/admin/payouts">Review related payout hold</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
