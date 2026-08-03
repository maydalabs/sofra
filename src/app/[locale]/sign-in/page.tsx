import { Mail } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { requestMagicLinkAction } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isDemoMode } from '@/server/auth/demo-session'

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Auth')

  return (
    <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
      <Card className="bg-card/90 w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <span className="bg-accent text-accent-foreground mx-auto flex size-12 items-center justify-center rounded-full">
            <Mail className="size-5" />
          </span>
          <CardTitle className="mt-4 text-4xl font-medium">
            {t('title')}
          </CardTitle>
          <p className="text-muted-foreground text-sm leading-6">
            {t('intro')}
          </p>
        </CardHeader>
        <CardContent>
          {isDemoMode() ? (
            <Alert className="mb-5">
              <AlertDescription>{t('demoNote')}</AlertDescription>
            </Alert>
          ) : null}
          <form action={requestMagicLinkAction} className="space-y-5">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </div>
            <Button className="h-11 w-full" type="submit">
              {t('submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
