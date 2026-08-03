'use server'

import { redirect } from 'next/navigation'

import { setDemoPersona, type DemoPersona } from '@/server/auth/demo-session'

const destinationByPersona: Record<DemoPersona, string> = {
  traveler: '/account',
  host: '/host/dashboard',
  partner: '/partner',
  operator: '/admin',
}

export async function chooseDemoPersona(formData: FormData) {
  const rawPersona = formData.get('persona')
  const rawLocale = formData.get('locale')
  const persona: DemoPersona =
    rawPersona === 'host' ||
    rawPersona === 'partner' ||
    rawPersona === 'operator'
      ? rawPersona
      : 'traveler'
  const locale = rawLocale === 'tr' ? 'tr' : 'en'
  await setDemoPersona(persona)
  redirect(`/${locale}${destinationByPersona[persona]}`)
}
