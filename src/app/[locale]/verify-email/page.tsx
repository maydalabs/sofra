import { MailCheck } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Auth')
  const common = await getTranslations('Common')

  return (
    <div className="container-shell flex min-h-[70vh] items-center justify-center py-16">
      <Card className="max-w-lg text-center">
        <CardContent className="p-9">
          <MailCheck className="text-primary mx-auto size-10" />
          <h1 className="mt-5 text-4xl font-medium">{t('verifyTitle')}</h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t('verifyBody')}
          </p>
          <Button variant="outline" className="mt-7" asChild>
            <Link href="/tables">{common('browseTables')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
