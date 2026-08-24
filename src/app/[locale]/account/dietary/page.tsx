import { NextIntlClientProvider } from 'next-intl'
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DietaryDisclosureForm } from '@/features/dietary/dietary-disclosure-form'

import { requireTravelerPageActor } from '../authorize'

export default async function DietaryPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireTravelerPageActor(locale)
  const [t, dietaryT, messages] = await Promise.all([
    getTranslations('Account'),
    getTranslations('Dietary'),
    getMessages(),
  ])
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('dietary')}</CardTitle>
        <p className="text-muted-foreground text-sm">{dietaryT('intro')}</p>
      </CardHeader>
      <CardContent>
        <NextIntlClientProvider messages={{ Dietary: messages.Dietary }}>
          <DietaryDisclosureForm />
        </NextIntlClientProvider>
      </CardContent>
    </Card>
  )
}
