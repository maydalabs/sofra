import { CircleDollarSign, ShieldAlert } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatTry } from '@/features/pricing/pricing'
import { Link } from '@/i18n/navigation'
import { listOperatorPayouts } from '@/server/repositories/operator/queries'

import { requireOperatorPageActor } from '../authorize'

export default async function PayoutQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Payouts')
  const payouts = await listOperatorPayouts()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-3xl font-medium">{t('title')}</h2>
          <p className="text-muted-foreground text-sm">{t('intro')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="grid gap-5 rounded-2xl border p-5 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-heading text-2xl font-semibold">
                    {payout.tableLabel}
                  </p>
                  <Badge
                    variant={
                      payout.status === 'held' ? 'destructive' : 'secondary'
                    }
                  >
                    {payout.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {payout.id}
                </p>
                {payout.holdReason ? (
                  <p className="text-muted-foreground mt-3 text-sm">
                    {payout.holdReason}
                  </p>
                ) : null}
              </div>
              <div className="lg:text-right">
                <p className="font-heading text-3xl font-semibold">
                  {formatTry(
                    payout.hostPayoutKurus,
                    locale === 'tr' ? 'tr-TR' : 'en-US',
                  )}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('hostNet')}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Alert variant="destructive">
        <ShieldAlert className="size-4" />
        <AlertTitle>{t('holdTitle')}</AlertTitle>
        <AlertDescription>{t('holdBody')}</AlertDescription>
      </Alert>
      <Button variant="outline" asChild>
        <Link href="/admin/incidents">
          <CircleDollarSign className="size-4" />
          {t('incidents')}
        </Link>
      </Button>
    </div>
  )
}
