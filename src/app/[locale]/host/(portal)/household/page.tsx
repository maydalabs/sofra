import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { requireHostPageActor } from '../authorize'

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireHostPageActor(locale)
  const t = await getTranslations('HostPortal')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('household')}</CardTitle>
        <p className="text-muted-foreground text-sm">{t('householdIntro')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert id="household-preview-note">
          <AlertDescription>{t('householdPreview')}</AlertDescription>
        </Alert>
        <form aria-describedby="household-preview-note" className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="household-name">{t('publicHouseholdName')}</Label>
            <Input
              id="household-name"
              defaultValue={t('demoHouseholdName')}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="structure">{t('householdStructure')}</Label>
            <Input
              id="structure"
              defaultValue={t('demoHouseholdStructure')}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="story">{t('householdStory')}</Label>
            <Textarea
              id="story"
              rows={6}
              defaultValue={t('demoHouseholdStory')}
              readOnly
            />
          </div>
          <Button type="button" disabled>
            {t('profileEditingUnavailable')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
