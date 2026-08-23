import 'server-only'

import { createSupabasePublicClient } from '@/server/database/supabase-public'
import { createSupabaseServerClient } from '@/server/database/supabase-server'
import { isDemoMode } from '@/server/auth/demo-session'

import { DemoSofraReadRepository } from './demo-read-repository'
import { RepositoryUnavailableError } from './errors'
import { SupabaseReadGateway } from './supabase/gateway'
import { SupabaseSofraReadRepository } from './supabase/read-repository'

export async function getPublicSofraReadRepository() {
  const client = createSupabasePublicClient()
  if (!client) return new DemoSofraReadRepository()
  return new SupabaseSofraReadRepository(new SupabaseReadGateway(client))
}

export async function getAuthenticatedSofraReadRepository(actorId: string) {
  if (isDemoMode()) return new DemoSofraReadRepository(actorId)

  const client = await createSupabaseServerClient()
  if (!client) {
    throw new RepositoryUnavailableError(
      'Authenticated data access requires configured Supabase credentials',
    )
  }
  return new SupabaseSofraReadRepository(
    new SupabaseReadGateway(client),
    actorId,
  )
}
