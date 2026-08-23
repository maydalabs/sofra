'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('States')
  return (
    <div
      className="container-shell flex min-h-[60vh] items-center justify-center py-16"
      role="alert"
      aria-live="assertive"
    >
      <Card className="max-w-xl text-center">
        <CardContent className="p-10">
          <p className="eyebrow">{t('safeStop')}</p>
          <h1 className="mt-4 text-4xl font-medium">{t('errorTitle')}</h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t('errorBody')}
          </p>
          <Button className="mt-7" onClick={reset}>
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
