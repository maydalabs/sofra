import { LockKeyhole } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'

export default async function UnavailablePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('States')
  const common = await getTranslations('Common')

  return (
    <div className="container-shell flex min-h-[65vh] items-center justify-center py-16">
      <Card className="max-w-xl text-center">
        <CardContent className="p-10">
          <LockKeyhole className="text-primary mx-auto size-10" />
          <h1 className="mt-5 text-4xl font-medium">
            {t('unauthorizedTitle')}
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t('unauthorizedBody')}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button asChild>
              <Link href="/demo">{common('demo')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/tables">{common('browseTables')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
