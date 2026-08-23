import { getTranslations } from 'next-intl/server'

import { PortalShell } from '@/components/portal-shell'

import { requireHostPageActor } from './authorize'

export default async function HostPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const actor = await requireHostPageActor(locale)
  const [t, common] = await Promise.all([
    getTranslations('HostPortal'),
    getTranslations('Common'),
  ])
  const items = [
    { href: '/host/dashboard', label: t('dashboard') },
    { href: '/host/tables', label: t('tables') },
    { href: '/host/tables/new', label: t('newTable') },
    { href: '/host/household', label: t('household') },
    { href: '/host/household/members', label: t('members') },
    { href: '/host/address', label: t('address') },
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
