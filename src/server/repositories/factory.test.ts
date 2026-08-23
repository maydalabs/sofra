import { afterEach, describe, expect, it, vi } from 'vitest'

import { DemoSofraReadRepository } from './demo-read-repository'
import { RepositoryUnavailableError } from './errors'
import {
  getAuthenticatedSofraReadRepository,
  getPublicSofraReadRepository,
} from './factory'

describe('repository factory', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps anonymous public discovery available with safe demo data', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    await expect(getPublicSofraReadRepository()).resolves.toBeInstanceOf(
      DemoSofraReadRepository,
    )
  })

  it('fails closed for protected production reads without Supabase', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    await expect(
      getAuthenticatedSofraReadRepository('actor-1'),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
  })
})
