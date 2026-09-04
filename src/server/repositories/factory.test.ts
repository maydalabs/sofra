import { afterEach, describe, expect, it, vi } from 'vitest'

import { DemoSofraReadRepository } from './demo-read-repository'
import { RepositoryUnavailableError } from './errors'
import {
  getAuthenticatedSofraReadRepository,
  getPublicSofraReadRepository,
} from './factory'

// Both cases turn on there being no database, so DATABASE_URL has to be stubbed
// rather than assumed absent. These tests used to blank the two Supabase
// variables the factory read before the Neon migration; nothing reads those
// now, so the tests only passed where the environment happened to be empty and
// failed in CI, which sets DATABASE_URL for the whole job.
describe('repository factory', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps anonymous public discovery available with safe demo data', async () => {
    vi.stubEnv('DATABASE_URL', '')

    await expect(getPublicSofraReadRepository()).resolves.toBeInstanceOf(
      DemoSofraReadRepository,
    )
  })

  it('fails closed for protected production reads without a database', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', '')

    await expect(
      getAuthenticatedSofraReadRepository('actor-1'),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })
})
