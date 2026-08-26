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

import { DemoSofraPartnerReadRepository } from './demo-repository'
import { PostgresPartnerReadGateway } from './postgres/gateway'
import { PostgresSofraPartnerReadRepository } from './postgres/repository'

interface PartnerRepositoryDependencies {
  getActor?: () => Promise<Actor | null>
  isDemo?: () => boolean
  getSql?: typeof getDatabase
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

  const sql = (dependencies.getSql ?? getDatabase)()
  if (!sql) {
    throw new RepositoryUnavailableError(
      'Partner data access requires a configured DATABASE_URL',
    )
  }

  return new PostgresSofraPartnerReadRepository(
    new PostgresPartnerReadGateway(sql, actor.id),
    actor,
  )
}
