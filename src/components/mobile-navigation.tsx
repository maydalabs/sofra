'use client'

import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Link } from '@/i18n/navigation'

export function MobileNavigation() {
  const t = useTranslations('Navigation')
  const common = useTranslations('Common')
  const links = [
    { href: '/tables' as const, label: t('tables') },
    { href: '/how-it-works' as const, label: t('how') },
    { href: '/host' as const, label: t('host') },
    { href: '/sign-in' as const, label: common('signIn') },
    { href: '/demo' as const, label: common('demo') },
  ]

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t('menu')}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-background p-7">
        <SheetTitle className="font-heading text-3xl">Sofra</SheetTitle>
        <nav className="mt-12 flex flex-col gap-1" aria-label={t('menu')}>
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                className="hover:bg-secondary rounded-xl px-3 py-3 text-base font-medium transition-colors"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
