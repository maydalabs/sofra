import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PortalShell } from '@/components/portal-shell'
import { privatePageMetadata } from '@/features/seo/config'

import { requireTravelerPageActor } from './authorize'

export const metadata: Metadata = privatePageMetadata

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const actor = await requireTravelerPageActor(locale)
  const [t, common] = await Promise.all([
    getTranslations('Account'),
    getTranslations('Common'),
  ])
  const items = [
    { href: '/account', label: t('title') },
    { href: '/account/bookings', label: t('upcoming') },
    { href: '/account/profile', label: t('profile') },
    { href: '/account/dietary', label: t('dietary') },
  ]

  return (
    <PortalShell
      title={t('title')}
      description={t('description')}
      items={items}
      actorLabel={actor.email}
      workspaceLabel={common('productWorkspace')}
      navigationLabel={common('workspaceNavigation', { workspace: t('title') })}
    >
      {children}
    </PortalShell>
  )
}
