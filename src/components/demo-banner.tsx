import { getTranslations } from 'next-intl/server'

import { isDemoMode } from '@/server/auth/demo-session'

export async function DemoBanner() {
  if (!isDemoMode()) return null
  const t = await getTranslations('Common')

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-[11px] font-semibold tracking-[0.08em] uppercase">
      {t('demoMode')}
    </div>
  )
}
