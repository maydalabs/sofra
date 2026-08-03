import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { PortalShell } from '@/components/portal-shell'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'

export default async function HostPortalLayout({
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
    assertHasAnyRole(actor, ['certified_host'])
  } catch {
    redirect(`/${locale}/unavailable`)
  }
  const t = await getTranslations('HostPortal')
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
      description="Propose household tables, follow approval, and prepare for confirmed travelers."
      items={items}
      actorLabel={actor.email}
    >
      {children}
    </PortalShell>
  )
}
