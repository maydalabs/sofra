import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { MobileNavigation } from '@/components/mobile-navigation'
import { PublicNavigation } from '@/components/public-navigation'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function SiteHeader() {
  const common = await getTranslations('Common')

  return (
    <header className="border-border/70 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container-shell flex h-[4.75rem] items-center justify-between gap-8">
        <BrandMark homeLabel={common('homeLabel')} />
        <PublicNavigation className="hidden items-center gap-7 md:flex" />
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher compact />
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
