import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PortalShell } from '@/components/portal-shell'
import { privatePageMetadata } from '@/features/seo/config'

import { requirePartnerPageActor } from './authorize'

export const metadata: Metadata = privatePageMetadata

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
