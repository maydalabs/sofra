import 'server-only'

import { connection } from 'next/server'

import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import type { Actor } from '@/server/authorization/roles'
import {
  assertHasAnyRole,
  AuthorizationError,
} from '@/server/authorization/roles'
import { createSupabaseAdminClient } from '@/server/database/supabase-admin'
import { RepositoryUnavailableError } from '@/server/repositories/errors'

import { DemoSofraOperatorReadRepository } from './demo-repository'
import { SupabaseOperatorReadGateway } from './supabase/gateway'
import { SupabaseSofraOperatorReadRepository } from './supabase/repository'

interface OperatorRepositoryDependencies {
  getActor?: () => Promise<Actor | null>
  isDemo?: () => boolean
  createAdminClient?: typeof createSupabaseAdminClient
}

export async function getOperatorSofraReadRepository(
  dependencies: OperatorRepositoryDependencies = {},
) {
  if (!dependencies.getActor) await connection()
  const actor = await (dependencies.getActor ?? getCurrentActor)()
  if (!actor) throw new AuthorizationError('Authentication required')

  // This check must happen before service-role credentials are read or a
  // privileged client is created.
  assertHasAnyRole(actor, ['operator', 'administrator'])

  if ((dependencies.isDemo ?? isDemoMode)()) {
    return new DemoSofraOperatorReadRepository(actor)
  }

  const client = (dependencies.createAdminClient ?? createSupabaseAdminClient)()
  if (!client) {
    throw new RepositoryUnavailableError(
      'Operator data access requires configured server-only Supabase credentials',
    )
  }

  return new SupabaseSofraOperatorReadRepository(
    new SupabaseOperatorReadGateway(client),
    actor,
  )
}
