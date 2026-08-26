import 'server-only'

import { headers } from 'next/headers'

import { auth } from '@/server/auth/auth'
import { getDemoActor, isDemoMode } from '@/server/auth/demo-session'
import type { Actor, ApplicationRole } from '@/server/authorization/roles'
import { applicationRoles } from '@/server/authorization/roles'
import { getDatabase } from '@/server/database/client'

interface ActorRow {
  id: string
  roles: string[]
}

/**
 * Resolves the signed-in person to a domain actor.
 *
 * The returned id is the PROFILE id, not the auth user id: every domain foreign
 * key references profiles, and the auth provider's identity is deliberately
 * confined to profiles.auth_user_id.
 */
export async function getCurrentActor(): Promise<Actor | null> {
  if (isDemoMode()) return getDemoActor()

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || !session.user.email) return null

  const sql = getDatabase()
  if (!sql) return null

  const rows = await sql<ActorRow[]>`
    select
      p.id,
      coalesce(
        array_agg(r.code::text) filter (where r.code is not null),
        '{}'
      ) as roles
    from public.profiles p
    left join public.role_assignments ra
      on ra.profile_id = p.id
      -- Revoked assignments are excluded here explicitly rather than relying on
      -- a database policy to filter them out.
      and ra.revoked_at is null
    left join public.roles r on r.id = ra.role_id
    where p.auth_user_id = ${session.user.id}
    group by p.id
  `

  const profile = rows[0]
  if (!profile) return null

  const roles = profile.roles.filter((role): role is ApplicationRole =>
    (applicationRoles as readonly string[]).includes(role),
  )

  return {
    id: profile.id,
    email: session.user.email,
    emailVerified: Boolean(session.user.emailVerified),
    roles,
    source: 'database',
  }
}
