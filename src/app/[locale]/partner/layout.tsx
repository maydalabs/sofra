import { getTranslations } from 'next-intl/server'

import { PortalShell } from '@/components/portal-shell'

import { requirePartnerPageActor } from './authorize'

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const actor = await requirePartnerPageActor(locale)
  const [t, common] = await Promise.all([
    getTranslations('Partner'),
    getTranslations('Common'),
  ])
  return (
    <PortalShell
      title={t('title')}
      description={t('description')}
      items={[{ href: '/partner', label: t('title') }]}
      actorLabel={actor.email}
      workspaceLabel={common('productWorkspace')}
      navigationLabel={common('workspaceNavigation', { workspace: t('title') })}
    >
      {children}
    </PortalShell>
  )
}
