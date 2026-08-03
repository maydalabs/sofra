import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HostPortal')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{t('household')}</CardTitle>
        <p className="text-muted-foreground text-sm">
          Public story and atmosphere. The private address lives in a separate
          protected record.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="household-name">Public household name</Label>
            <Input id="household-name" defaultValue="Ayşe & Levent’s table" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="structure">Household structure</Label>
            <Input
              id="structure"
              defaultValue="A couple who have shared this neighborhood for three decades"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="story">Household story</Label>
            <Textarea
              id="story"
              rows={6}
              defaultValue="Sunday dinner stretches into tea in this home. This is how dinner happens in our home."
            />
          </div>
          <Button type="submit">Save household profile</Button>
        </form>
      </CardContent>
    </Card>
  )
}
