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
    const getSql = vi.fn(() => null)

    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => traveler,
        isDemo: () => false,
        getSql,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(getSql).not.toHaveBeenCalled()
  })

  it('rejects a missing actor before privileged client creation', async () => {
    const getSql = vi.fn(() => null)

    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => null,
        isDemo: () => false,
        getSql,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(getSql).not.toHaveBeenCalled()
  })

  it('fails closed without a configured database', async () => {
    await expect(
      getOperatorSofraReadRepository({
        getActor: async () => operator,
        isDemo: () => false,
        getSql: () => null,
      }),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })
})
