import { getTranslations } from 'next-intl/server'

import { BrandMark } from '@/components/brand-mark'
import { Link } from '@/i18n/navigation'

export async function SiteFooter() {
  const t = await getTranslations('Common')
  const navigation = await getTranslations('Navigation')

  return (
    <footer className="border-border bg-card mt-20 border-t">
      <div className="container-shell grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-md">
          <BrandMark />
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            {t('promise')}
          </p>
          <p className="text-muted-foreground mt-6 text-xs">
            Phase 1 · Private development foundation
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="eyebrow">Explore</p>
          <Link href="/tables" className="hover:text-primary">
            {navigation('tables')}
          </Link>
          <Link href="/how-it-works" className="hover:text-primary">
            {navigation('how')}
          </Link>
          <Link href="/host" className="hover:text-primary">
            {navigation('host')}
          </Link>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <p className="eyebrow">Foundation</p>
          <Link href="/account" className="hover:text-primary">
            {t('account')}
          </Link>
          <Link href="/host/dashboard" className="hover:text-primary">
            {t('hostPortal')}
          </Link>
          <Link href="/demo" className="hover:text-primary">
            {t('demo')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
