'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link, usePathname } from '@/i18n/navigation'

export function LocaleSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations('Navigation')
  const alternativeLocale = locale === 'tr' ? 'en' : 'tr'
  const language = t(alternativeLocale === 'tr' ? 'turkish' : 'english')

  return (
    <Button
      variant={compact ? 'ghost' : 'outline'}
      size="sm"
      className={className}
      asChild
    >
      <Link
        href={pathname}
        locale={alternativeLocale}
        hrefLang={alternativeLocale}
        aria-label={t('switchLanguage', { language })}
      >
        {compact ? alternativeLocale.toUpperCase() : language}
      </Link>
    </Button>
  )
}
