import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
        <p className="text-muted-foreground text-sm">{t('pricingIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-7">
        <Alert>
          <AlertTitle>{t('pricingPreviewTitle')}</AlertTitle>
          <AlertDescription id="pricing-preview-note">
            {t('pricingPreviewBody')}
          </AlertDescription>
        </Alert>
        <form
          aria-describedby="pricing-preview-note"
          className="grid gap-5 sm:grid-cols-3"
        >
          <PolicyField
            id="take-rate"
            label={t('takeRateBasisPoints')}
            value={developmentPolicy.takeRateBasisPoints}
          />
          <PolicyField
            id="minimum-lead"
            label={t('minimumLeadDays')}
            value={developmentPolicy.minimumLeadDays}
          />
          <PolicyField
            id="publishing-horizon"
            label={t('publishingHorizonDays')}
            value={developmentPolicy.maximumPublishingHorizonDays}
          />
          <PolicyField
            id="booking-cutoff"
            label={t('bookingCutoffHours')}
            value={developmentPolicy.bookingCutoffHours}
          />
          <PolicyField
            id="roster-lock"
            label={t('rosterLockHours')}
            value={developmentPolicy.rosterLockHours}
          />
          <PolicyField
            id="new-host-limit"
            label={t('newHostActiveLimit')}
            value={developmentPolicy.newHostActiveTableLimit}
          />
          <Button type="button" className="w-fit sm:col-span-3" disabled>
            {t('policyEditingUnavailable')}
          </Button>
        </form>
        <div className="bg-secondary rounded-2xl border p-5">
          <p className="eyebrow">{t('integerPricingExample')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Detail
              label={t('hostNet')}
              value={formatTry(
                example.hostNetKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            />
            <Detail
              label={t('guestTotal')}
              value={formatTry(
                example.guestTotalKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            />
            <Detail
              label={t('sofraGrossFee')}
              value={formatTry(
                example.sofraGrossFeeKurus,
                locale === 'tr' ? 'tr-TR' : 'en-US',
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PolicyField({
  id,
  label,
  value,
}: {
  id: string
  label: string
  value: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" defaultValue={value} readOnly />
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
