import { getTranslations } from 'next-intl/server'

import { PortalShell } from '@/components/portal-shell'

import { requireOperatorPageActor } from './authorize'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const actor = await requireOperatorPageActor(locale)
  const t = await getTranslations('Admin')
  const items = [
    { href: '/admin', label: t('overview') },
    { href: '/admin/host-applications', label: t('applications') },
    { href: '/admin/tables', label: t('tables') },
    { href: '/admin/bookings', label: t('bookings') },
    { href: '/admin/payouts', label: t('payouts') },
    { href: '/admin/incidents', label: t('incidents') },
    { href: '/admin/audit', label: t('audit') },
    { href: '/admin/pricing', label: t('pricing') },
  ]
  return (
    <PortalShell
      title={t('title')}
      description="Human-reviewed certification, publication, safety, and financial operations."
      items={items}
      actorLabel={actor.email}
    >
      {children}
    </PortalShell>
  )
}
