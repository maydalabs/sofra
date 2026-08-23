import 'server-only'

import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { getCurrentActor } from '@/server/auth/current-actor'
import { assertHasAnyRole } from '@/server/authorization/roles'

export async function requireOperatorPageActor(locale: string) {
  await connection()
  const actor = await getCurrentActor()
  if (!actor) redirect(`/${locale}/sign-in`)

  try {
    assertHasAnyRole(actor, ['operator', 'administrator'])
  } catch {
    redirect(`/${locale}/unavailable`)
  }

  return actor
}
