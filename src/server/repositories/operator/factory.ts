import 'server-only'

import { connection } from 'next/server'

import { getCurrentActor } from '@/server/auth/current-actor'
import { isDemoMode } from '@/server/auth/demo-session'
import type { Actor } from '@/server/authorization/roles'
import {
  assertHasAnyRole,
  AuthorizationError,
} from '@/server/authorization/roles'
import { getDatabase } from '@/server/database/client'
import { RepositoryUnavailableError } from '@/server/repositories/errors'

import { DemoSofraOperatorReadRepository } from './demo-repository'
import { PostgresOperatorReadGateway } from './postgres/gateway'
import { PostgresSofraOperatorReadRepository } from './postgres/repository'

interface OperatorRepositoryDependencies {
  getActor?: () => Promise<Actor | null>
  isDemo?: () => boolean
  getSql?: typeof getDatabase
}

export async function getOperatorSofraReadRepository(
  dependencies: OperatorRepositoryDependencies = {},
) {
  if (!dependencies.getActor) await connection()
  const actor = await (dependencies.getActor ?? getCurrentActor)()
  if (!actor) throw new AuthorizationError('Authentication required')

  // This check must happen before any cross-user query is possible. Operator
  // reads are not scoped to the actor's own rows, so the role gate here is the
  // only thing standing between an actor and other people's records.
  assertHasAnyRole(actor, ['operator', 'administrator'])

  if ((dependencies.isDemo ?? isDemoMode)()) {
    return new DemoSofraOperatorReadRepository(actor)
  }

  const sql = (dependencies.getSql ?? getDatabase)()
  if (!sql) {
    throw new RepositoryUnavailableError(
      'Operator data access requires a configured DATABASE_URL',
    )
  }

  return new PostgresSofraOperatorReadRepository(
    new PostgresOperatorReadGateway(sql),
    actor,
  )
}
