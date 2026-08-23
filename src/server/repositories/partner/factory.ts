import 'server-only'

import { connection } from 'next/server'

import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import type { Actor } from '@/server/authorization/roles'
import {
  assertHasAnyRole,
  AuthorizationError,
} from '@/server/authorization/roles'
import { createSupabaseServerClient } from '@/server/database/supabase-server'
import { RepositoryUnavailableError } from '@/server/repositories/errors'

import { DemoSofraPartnerReadRepository } from './demo-repository'
import { SupabasePartnerReadGateway } from './supabase/gateway'
import { SupabaseSofraPartnerReadRepository } from './supabase/repository'

interface PartnerRepositoryDependencies {
  getActor?: () => Promise<Actor | null>
  isDemo?: () => boolean
  createServerClient?: typeof createSupabaseServerClient
}

export async function getPartnerSofraReadRepository(
  dependencies: PartnerRepositoryDependencies = {},
) {
  if (!dependencies.getActor) await connection()
  const actor = await (dependencies.getActor ?? getCurrentActor)()
  if (!actor) throw new AuthorizationError('Authentication required')

  assertHasAnyRole(actor, ['partner_user'])

  if ((dependencies.isDemo ?? isDemoMode)()) {
    return new DemoSofraPartnerReadRepository(actor)
  }

  const client = await (
    dependencies.createServerClient ?? createSupabaseServerClient
  )()
  if (!client) {
    throw new RepositoryUnavailableError(
      'Partner data access requires configured Supabase credentials',
    )
  }

  return new SupabaseSofraPartnerReadRepository(
    new SupabasePartnerReadGateway(client),
    actor,
  )
}
