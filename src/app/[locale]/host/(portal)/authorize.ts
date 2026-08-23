import 'server-only'

import { redirect } from 'next/navigation'

import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'

export async function requireHostPageActor(locale: string) {
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)
  try {
    assertHasAnyRole(actor, ['certified_host'])
  } catch {
    redirect(`/${locale}/unavailable`)
  }
  return actor
}
