import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default async function HostAssessmentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Admin')
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Selin & Derya household</CardTitle>
          <p className="text-muted-foreground text-sm">
            Fictional application · no real household or address
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 rounded-2xl border p-5 sm:grid-cols-2">
            <Detail
              label="Household structure"
              value="A parent and adult child"
            />
            <Detail
              label="Proposed neighborhood"
              value="Üsküdar demo cluster"
            />
            <Detail label="Desired capacity" value="4 travelers" />
            <Detail label="Languages" value="Turkish · English" />
          </div>
          <div>
            <h2 className="text-2xl">Hosting motivation</h2>
            <p className="text-muted-foreground mt-2 leading-7">
              We already host long Sunday dinners and would like to welcome
              careful, curious visitors into that rhythm.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('assessments')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Private assessment notes</Label>
              <Textarea id="notes" rows={6} />
            </div>
            <Button type="submit" className="w-full">
              Save assessment
            </Button>
            <Button type="button" variant="outline" className="w-full">
              {t('certify')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
