import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { PortalShell } from '@/components/portal-shell'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  try {
    assertHasAnyRole(actor, ['partner_user'])
  } catch {
    redirect(`/${locale}/unavailable`)
  }
  const t = await getTranslations('Partner')
  return (
    <PortalShell
      title={t('title')}
      description={t('description')}
      items={[{ href: '/partner', label: t('title') }]}
      actorLabel={actor.email}
    >
      {children}
    </PortalShell>
  )
}
