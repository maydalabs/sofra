import 'server-only'

import { isDemoMode } from '@/server/auth/demo-session'
import { getDatabase } from '@/server/database/client'

import { DemoSofraReadRepository } from './demo-read-repository'
import { RepositoryUnavailableError } from './errors'
import { PostgresReadGateway } from './postgres/gateway'
import { PostgresSofraReadRepository } from './postgres/read-repository'

/**
 * Anonymous discovery reads the public projection when a database is
 * configured, and falls back to the fictional demo set otherwise so local work
 * without a database still renders something useful.
 */
export async function getPublicSofraReadRepository() {
  const sql = getDatabase()
  if (!sql) return new DemoSofraReadRepository()
  return new PostgresSofraReadRepository(new PostgresReadGateway(sql))
}

/**
 * Authenticated access fails closed: without a configured database this throws
 * rather than silently serving fictional data to a signed-in person.
 */
export async function getAuthenticatedSofraReadRepository(actorId: string) {
  if (isDemoMode()) return new DemoSofraReadRepository(actorId)

  const sql = getDatabase()
  if (!sql) {
    throw new RepositoryUnavailableError(
      'Authenticated data access requires a configured DATABASE_URL',
    )
  }
  return new PostgresSofraReadRepository(
    new PostgresReadGateway(sql, actorId),
    actorId,
  )
}
