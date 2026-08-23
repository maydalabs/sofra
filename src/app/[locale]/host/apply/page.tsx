import { getTranslations, setRequestLocale } from 'next-intl/server'

import { submitHostApplicationAction } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  const t = await getTranslations('HostPortal')

  return (
    <div className="container-shell py-14 sm:py-20">
      <Card className="bg-card/85 mx-auto max-w-3xl">
        <CardHeader>
          <p className="eyebrow">Verified email required</p>
          <CardTitle className="text-4xl font-medium">
            {t('application')}
          </CardTitle>
          <p className="text-muted-foreground text-sm leading-6">
            Tell us how dinner happens in your home. This submits for human
            review; approval is never automatic.
          </p>
        </CardHeader>
        <CardContent>
          {query.application === 'reviewed' ? (
            <Alert className="mb-6">
              <AlertDescription>
                The local demo validated this application for human review. No
                durable application, certification, or publication was created.
              </AlertDescription>
            </Alert>
          ) : null}
          {query.application === 'unavailable' ? (
            <Alert className="mb-6">
              <AlertDescription>
                No application was submitted. Production applications remain
                disabled until the protected application-write repository is
                connected.
              </AlertDescription>
            </Alert>
          ) : null}
          <form
            action={submitHostApplicationAction}
            className="grid gap-6 sm:grid-cols-2"
          >
            <input type="hidden" name="locale" value={locale} />
            <Field label="Household public name" name="householdName" />
            <Field label="Approximate neighborhood" name="neighborhood" />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="story">Household story</Label>
              <Textarea
                id="story"
                name="story"
                rows={5}
                required
                placeholder="This is how dinner happens in our home…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="motivation">Why would you like to host?</Label>
              <Textarea id="motivation" name="motivation" rows={4} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="participation">
                Who will participate in dinner or tea?
              </Label>
              <Textarea
                id="participation"
                name="participation"
                rows={3}
                required
              />
            </div>
            <Button type="submit" className="sm:col-span-2">
              Submit application for review
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
