import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { developmentPolicy } from '@/features/policy/config'
import { calculateGuestPrice, formatTry } from '@/features/pricing/pricing'

import { requireOperatorPageActor } from '../authorize'

export default async function PricingPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const example = calculateGuestPrice(120_000, developmentPolicy)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('pricing')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Development policy editor. Changes would create a new dated policy and
          audit entry rather than rewriting booking snapshots.
        </p>
      </CardHeader>
      <CardContent className="space-y-7">
        <form className="grid gap-5 sm:grid-cols-3">
          <PolicyField
            label="Take rate (basis points)"
            value={developmentPolicy.takeRateBasisPoints}
          />
          <PolicyField
            label="Minimum lead days"
            value={developmentPolicy.minimumLeadDays}
          />
          <PolicyField
            label="Publishing horizon days"
            value={developmentPolicy.maximumPublishingHorizonDays}
          />
          <PolicyField
            label="Booking cutoff hours"
            value={developmentPolicy.bookingCutoffHours}
          />
          <PolicyField
            label="Roster lock hours"
            value={developmentPolicy.rosterLockHours}
          />
          <PolicyField
            label="New-host active limit"
            value={developmentPolicy.newHostActiveTableLimit}
          />
          <Button type="submit" className="w-fit sm:col-span-3">
            Create new development policy
          </Button>
        </form>
        <div className="bg-secondary rounded-2xl border p-5">
          <p className="eyebrow">Integer pricing example</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Detail label="Host net" value={formatTry(example.hostNetKurus)} />
            <Detail
              label="Guest total"
              value={formatTry(example.guestTotalKurus)}
            />
            <Detail
              label="Sofra gross fee"
              value={formatTry(example.sofraGrossFeeKurus)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PolicyField({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" defaultValue={value} />
    </div>
  )
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-heading mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
