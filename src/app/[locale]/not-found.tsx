import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'

export default async function NotFoundPage() {
  const t = await getTranslations('States')
  const common = await getTranslations('Common')
  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <Card className="max-w-xl text-center">
        <CardContent className="p-10">
          <p className="eyebrow">{t('unavailableEyebrow')}</p>
          <h1 className="mt-4 text-4xl font-medium">{t('notFoundTitle')}</h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t('notFoundBody')}
          </p>
          <Button className="mt-7" asChild>
            <Link href="/tables">{common('browseTables')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
