import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DietaryDisclosureForm } from '@/features/dietary/dietary-disclosure-form'

export default async function DietaryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Account')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('dietary')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Disclosures are attached to a traveler or booking for compatibility
          review, never to a public profile.
        </p>
      </CardHeader>
      <CardContent>
        <DietaryDisclosureForm />
      </CardContent>
    </Card>
  )
}
