import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'
import { RepositoryUnavailableError } from '@/server/repositories/errors'

import { DemoSofraOperatorReadRepository } from './demo-repository'
import { getOperatorSofraReadRepository } from './factory'

const operator: Actor = {
  id: 'operator-1',
  email: 'operator@sofra.example',
  emailVerified: true,
  roles: ['operator'],
  source: 'demo',
}

const traveler: Actor = {
  id: 'traveler-1',
  email: 'traveler@sofra.example',
  emailVerified: true,
  roles: ['traveler'],
  source: 'demo',
}

describe('operator repository factory', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the protected demo repository for an operator in demo mode', async () => {
    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => operator,
        isDemo: () => true,
      }),
    ).resolves.toBeInstanceOf(DemoSofraOperatorReadRepository)
  })

  it('rejects a non-operator before privileged client creation', async () => {
    const createAdminClient = vi.fn(() => null)

    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => traveler,
        isDemo: () => false,
        createAdminClient,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a missing actor before privileged client creation', async () => {
    const createAdminClient = vi.fn(() => null)

    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => null,
        isDemo: () => false,
        createAdminClient,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('fails closed without server-only Supabase credentials', async () => {
    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => operator,
        isDemo: () => false,
        createAdminClient: () => null,
      }),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })
})
