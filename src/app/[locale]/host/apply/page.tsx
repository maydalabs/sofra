import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { submitHostApplicationAction } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { privatePageMetadata } from '@/features/seo/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'HostApplication' })
  return {
    ...privatePageMetadata,
    title: { absolute: `${t('title')} · Sofra` },
    description: t('intro'),
  }
}

export default async function HostApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ application?: string }>
}) {
  const { locale } = await params
  const query = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations('HostApplication')

  return (
    <div className="container-shell py-14 sm:py-20">
      <Card className="bg-card/85 mx-auto max-w-3xl">
        <CardHeader>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="font-heading text-4xl font-medium">{t('title')}</h1>
          <p className="text-muted-foreground text-sm leading-6">
            {t('intro')}
          </p>
          <p
            id="host-application-requirements"
            className="text-muted-foreground text-xs"
          >
            {t('requiredNote')}
          </p>
        </CardHeader>
        <CardContent>
          {query.application === 'reviewed' ? (
            <Alert className="mb-6">
              <AlertDescription>{t('reviewed')}</AlertDescription>
            </Alert>
          ) : null}
          {query.application === 'unavailable' ? (
            <Alert className="mb-6">
              <AlertDescription>{t('unavailable')}</AlertDescription>
            </Alert>
          ) : null}
          <form
            action={submitHostApplicationAction}
            className="grid gap-6 sm:grid-cols-2"
            aria-label={t('formLabel')}
            aria-describedby="host-application-requirements"
          >
            <input type="hidden" name="locale" value={locale} />
            <Field label={t('householdName')} name="householdName" />
            <Field label={t('neighborhood')} name="neighborhood" />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="story">{t('story')}</Label>
              <Textarea
                id="story"
                name="story"
                rows={5}
                required
                placeholder={t('storyPlaceholder')}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="motivation">{t('motivation')}</Label>
              <Textarea id="motivation" name="motivation" rows={4} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="participation">{t('participation')}</Label>
              <Textarea
                id="participation"
                name="participation"
                rows={3}
                required
              />
            </div>
            <Button type="submit" className="sm:col-span-2">
              {t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required />
    </div>
  )
}
