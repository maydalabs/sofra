import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { PortalShell } from '@/components/portal-shell'
import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'

export default async function AccountLayout({
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
    assertHasAnyRole(actor, ['traveler'])
  } catch {
    redirect(`/${locale}/unavailable`)
  }
  const t = await getTranslations('Account')
  const items = [
    { href: '/account', label: t('title') },
    { href: '/account/bookings', label: t('upcoming') },
    { href: '/account/profile', label: t('profile') },
    { href: '/account/dietary', label: t('dietary') },
  ]

  return (
    <PortalShell
      title={t('title')}
      description="Manage upcoming dinners and private traveler information."
      items={items}
      actorLabel={actor.email}
    >
      {children}
    </PortalShell>
  )
}
