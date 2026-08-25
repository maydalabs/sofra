'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { isNavigationPathActive } from '@/lib/navigation'

const links = [
  { href: '/tables' as const, message: 'tables' as const },
  { href: '/how-it-works' as const, message: 'how' as const },
  { href: '/host' as const, message: 'host' as const },
]

export function PublicNavigation({ className }: { className?: string }) {
  const pathname = usePathname()
  const t = useTranslations('Navigation')

  return (
    <nav className={className} aria-label={t('menu')}>
      {links.map((link) => {
        const isActive = isNavigationPathActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'hover:text-primary rounded-sm text-sm font-medium transition-colors',
              isActive &&
                'text-primary underline decoration-2 underline-offset-8',
            )}
          >
            {t(link.message)}
          </Link>
        )
      })}
    </nav>
  )
}
