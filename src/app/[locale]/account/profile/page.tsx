import { getTranslations, setRequestLocale } from 'next-intl/server'

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
        <p className="text-muted-foreground text-sm">
          Public profile fields are kept separate from dietary disclosures.
        </p>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" defaultValue="Demo Traveler" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locale">Preferred language</Label>
            <Input id="locale" defaultValue={locale.toUpperCase()} readOnly />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="context">Travel context (optional)</Label>
            <Input id="context" placeholder="First visit to Istanbul" />
          </div>
          <Button type="submit" className="w-fit">
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
