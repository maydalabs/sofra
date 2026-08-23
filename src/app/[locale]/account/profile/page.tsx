import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { requireTravelerPageActor } from '../authorize'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireTravelerPageActor(locale)
  const t = await getTranslations('Account')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('profile')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('profileIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert id="profile-preview-note">
          <AlertDescription>{t('profilePreview')}</AlertDescription>
        </Alert>
        <form
          aria-describedby="profile-preview-note"
          className="grid max-w-2xl gap-5 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="name">{t('displayName')}</Label>
            <Input id="name" defaultValue={t('profileExampleName')} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locale">{t('preferredLanguage')}</Label>
            <Input id="locale" defaultValue={locale.toUpperCase()} readOnly />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="context">{t('travelContext')}</Label>
            <Input
              id="context"
              defaultValue={t('travelContextExample')}
              readOnly
            />
          </div>
          <Button type="button" className="w-fit" disabled>
            {t('profileEditingUnavailable')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
