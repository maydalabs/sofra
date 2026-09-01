'use client'

import * as React from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import type { PortalNavigationItem } from './portal-shell'

export function PortalNavigation({
  items,
  label,
}: {
  items: readonly PortalNavigationItem[]
  label: string
}) {
  const pathname = usePathname()
  const navRef = React.useRef<HTMLElement>(null)

  // On mobile the nav scrolls horizontally, and a deep link can land with the
  // active section off-screen -- which reads as being on the wrong page.
  React.useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pathname])
  const activeHref = [...items]
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href

  return (
    <nav
      ref={navRef}
      className="flex snap-x gap-2 overflow-x-auto pb-2 lg:sticky lg:top-28 lg:flex-col"
      aria-label={label}
    >
      {items.map((item) => {
        const isActive = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'hover:bg-secondary focus-visible:ring-ring shrink-0 snap-start rounded-xl px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3',
              isActive && 'bg-secondary text-primary',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
