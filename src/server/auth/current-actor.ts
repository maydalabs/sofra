import 'server-only'

import { getDemoActor, isDemoMode } from '@/server/auth/demo-session'
import type { Actor, ApplicationRole } from '@/server/authorization/roles'
import { createSupabaseServerClient } from '@/server/database/supabase-server'

export async function getCurrentActor(): Promise<Actor | null> {
  if (isDemoMode()) return getDemoActor()

  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.email) return null

  const { data: assignments } = await supabase
    .from('role_assignments')
    .select('roles!inner(code)')
    .eq('profile_id', data.user.id)

  const roles = (assignments ?? [])
    .map((assignment) => {
      const relatedRole = assignment.roles as unknown as {
        code?: string
      } | null
      return relatedRole?.code
    })
    .filter((role): role is ApplicationRole =>
      [
        'traveler',
        'host_applicant',
        'certified_host',
        'partner_user',
        'operator',
        'administrator',
      ].includes(role ?? ''),
    )

  return {
    id: data.user.id,
    email: data.user.email,
    emailVerified: Boolean(data.user.email_confirmed_at),
    roles,
    source: 'supabase',
  }
}
