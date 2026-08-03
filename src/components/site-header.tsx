import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { MobileNavigation } from '@/components/mobile-navigation'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations('Navigation')
  const common = await getTranslations('Common')
  const alternativeLocale = locale === 'tr' ? 'en' : 'tr'

  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container-shell flex h-[4.75rem] items-center justify-between gap-8">
        <BrandMark />
        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label={t('menu')}
        >
          <Link
            href="/tables"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            {t('tables')}
          </Link>
          <Link
            href="/how-it-works"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            {t('how')}
          </Link>
          <Link
            href="/host"
            className="hover:text-primary text-sm font-medium transition-colors"
          >
            {t('host')}
          </Link>
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/"
              locale={alternativeLocale}
              aria-label={`${common('language')}: ${alternativeLocale.toUpperCase()}`}
            >
              {alternativeLocale.toUpperCase()}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">{common('signIn')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/tables">{common('browseTables')}</Link>
          </Button>
        </div>
        <MobileNavigation />
      </div>
    </header>
  )
}
