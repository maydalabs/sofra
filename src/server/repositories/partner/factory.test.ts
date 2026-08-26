import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'
import { RepositoryUnavailableError } from '@/server/repositories/errors'

import { DemoSofraPartnerReadRepository } from './demo-repository'
import { getPartnerSofraReadRepository } from './factory'

const partner: Actor = {
  id: 'partner-1',
  email: 'partner@sofra.example',
  emailVerified: true,
  roles: ['partner_user'],
  source: 'demo',
}

const traveler: Actor = {
  id: 'traveler-1',
  email: 'traveler@sofra.example',
  emailVerified: true,
  roles: ['traveler'],
  source: 'demo',
}

describe('partner repository factory', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the protected demo repository for a partner in demo mode', async () => {
    await expect(
      getPartnerSofraReadRepository({
        getActor: async () => partner,
        isDemo: () => true,
      }),
    ).resolves.toBeInstanceOf(DemoSofraPartnerReadRepository)
  })

  it('rejects a non-partner before creating a database client', async () => {
    const getSql = vi.fn(() => null)

    await expect(
      getPartnerSofraReadRepository({
        getActor: async () => traveler,
        isDemo: () => false,
        getSql,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(getSql).not.toHaveBeenCalled()
  })

  it('rejects a missing actor before creating a database client', async () => {
    const getSql = vi.fn(() => null)

    await expect(
      getPartnerSofraReadRepository({
        getActor: async () => null,
        isDemo: () => false,
        getSql,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(getSql).not.toHaveBeenCalled()
  })

  it('fails closed without a configured database', async () => {
    await expect(
      getPartnerSofraReadRepository({
        getActor: async () => partner,
        isDemo: () => false,
        getSql: () => null,
      }),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })
})
