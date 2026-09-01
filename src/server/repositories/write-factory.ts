import 'server-only'

import { isDemoMode } from '@/server/auth/demo-session'
import type { Actor } from '@/server/authorization/roles'
import { assertHasAnyRole } from '@/server/authorization/roles'
import { getDatabase } from '@/server/database/client'

import { RepositoryUnavailableError } from './errors'
import { PostgresSofraHostWriteRepository } from './postgres/host-write-repository'
import { PostgresSofraOperatorWriteRepository } from './postgres/operator-write-repository'
import { PostgresSofraPaymentWriteRepository } from './postgres/payment-write-repository'
import { PostgresSofraPostDinnerWriteRepository } from './postgres/post-dinner-write-repository'
import { PostgresSofraWriteRepository } from './postgres/write-repository'
import type {
  SofraHostWriteRepository,
  SofraOperatorWriteRepository,
  SofraPaymentWriteRepository,
  SofraPostDinnerWriteRepository,
  SofraWriteRepository,
} from './write-contracts'

/**
 * Durable writes require a real database and a real actor. There is no demo
 * implementation on purpose: a persona-backed walkthrough must not be able to
 * claim it stored something. Callers in demo mode should keep using the
 * existing non-durable review paths, which say so plainly.
 */
export class WritesUnavailableError extends RepositoryUnavailableError {
  constructor(message: string) {
    super(message)
    this.name = 'WritesUnavailableError'
  }
}

export async function getSofraWriteRepository(
  actorId: string,
): Promise<SofraWriteRepository> {
  if (isDemoMode()) {
    throw new WritesUnavailableError(
      'Durable writes are disabled in demo mode. The walkthrough uses non-durable review paths.',
    )
  }

  const sql = getDatabase()
  if (!sql) {
    throw new WritesUnavailableError(
      'Durable writes require a configured DATABASE_URL',
    )
  }

  return new PostgresSofraWriteRepository(sql, actorId)
}

/**
 * True when this environment can persist a booking at all. Lets a caller choose
 * the honest review path instead of attempting a write that must fail.
 */
export function canPersistWrites() {
  return !isDemoMode() && getDatabase() !== null
}

export async function getSofraHostWriteRepository(
  actorId: string,
): Promise<SofraHostWriteRepository> {
  if (isDemoMode()) {
    throw new WritesUnavailableError(
      'Durable writes are disabled in demo mode. The walkthrough uses non-durable review paths.',
    )
  }

  const sql = getDatabase()
  if (!sql) {
    throw new WritesUnavailableError(
      'Durable writes require a configured DATABASE_URL',
    )
  }

  return new PostgresSofraHostWriteRepository(sql, actorId)
}

/**
 * Operator writes act across users, so the role is verified before the
 * repository exists -- and again inside every SQL function it calls.
 */
export async function getSofraOperatorWriteRepository(
  actor: Actor,
): Promise<SofraOperatorWriteRepository> {
  assertHasAnyRole(actor, ['operator', 'administrator'])

  if (isDemoMode()) {
    throw new WritesUnavailableError(
      'Durable writes are disabled in demo mode. The walkthrough uses non-durable review paths.',
    )
  }

  const sql = getDatabase()
  if (!sql) {
    throw new WritesUnavailableError(
      'Durable writes require a configured DATABASE_URL',
    )
  }

  return new PostgresSofraOperatorWriteRepository(sql, actor.id)
}

export async function getSofraPostDinnerWriteRepository(
  actorId: string,
): Promise<SofraPostDinnerWriteRepository> {
  if (isDemoMode()) {
    throw new WritesUnavailableError(
      'Durable writes are disabled in demo mode. The walkthrough uses non-durable review paths.',
    )
  }

  const sql = getDatabase()
  if (!sql) {
    throw new WritesUnavailableError(
      'Durable writes require a configured DATABASE_URL',
    )
  }

  return new PostgresSofraPostDinnerWriteRepository(sql, actorId)
}

/**
 * The payment ledger. Payee registration is operator-gated inside SQL
 * (assert_operator); the recording functions are callable by the traveller's
 * own flow and by system jobs, and every one re-checks the booking's money
 * against what the database computed at booking time.
 */
export async function getSofraPaymentWriteRepository(
  actorId: string,
): Promise<SofraPaymentWriteRepository> {
  if (isDemoMode()) {
    throw new WritesUnavailableError(
      'Durable writes are disabled in demo mode. The walkthrough uses non-durable review paths.',
    )
  }

  const sql = getDatabase()
  if (!sql) {
    throw new WritesUnavailableError(
      'Durable writes require a configured DATABASE_URL',
    )
  }

  return new PostgresSofraPaymentWriteRepository(sql, actorId)
}
