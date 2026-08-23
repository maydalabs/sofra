'use server'

import { redirect } from 'next/navigation'

import { getDemoJourneyStep } from '@/features/demo/journey'
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

export async function chooseDemoJourneyStep(formData: FormData) {
  const rawStep = formData.get('step')
  const rawLocale = formData.get('locale')
  const step = typeof rawStep === 'string' ? getDemoJourneyStep(rawStep) : null
  if (!step) throw new Error('Unknown demo journey step')

  const locale = rawLocale === 'tr' ? 'tr' : 'en'
  await setDemoPersona(step.persona)
  redirect(`/${locale}${step.href}`)
}
