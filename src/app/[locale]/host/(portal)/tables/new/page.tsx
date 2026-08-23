import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isHostCertificationActive } from '@/features/hosts/certification'
import { CreateTableForm } from '@/features/hosted-tables/create-table-form'
import { developmentPolicy } from '@/features/policy/config'
import { getCurrentActor } from '@/server/auth/current-actor'
import { findHostCertification } from '@/server/repositories/queries'
import {
  getMaximumLocalDateTime,
  getMinimumLocalDateTime,
  getServerTimeMilliseconds,
} from '@/server/time/clock'

export default async function NewHostedTablePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  const certification = await findHostCertification(actor.id)
  const certificationIsActive = isHostCertificationActive(
    certification,
    new Date(getServerTimeMilliseconds()),
  )
  const minimumStartsAt = getMinimumLocalDateTime(
    developmentPolicy.minimumLeadDays,
  )
  const maximumStartsAt = getMaximumLocalDateTime(
    developmentPolicy.maximumPublishingHorizonDays,
  )
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
        {certification && certificationIsActive ? (
          <CreateTableForm
            certifiedCapacity={certification.certifiedTravelerCapacity}
            minimumStartsAt={minimumStartsAt}
            maximumStartsAt={maximumStartsAt}
          />
        ) : (
          <Alert>
            <AlertTitle>{t('certificationUnavailableTitle')}</AlertTitle>
            <AlertDescription>
              {t('certificationUnavailableBody')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
