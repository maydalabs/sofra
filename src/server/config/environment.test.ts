import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertProductionEnvironment,
  validateProductionEnvironment,
} from './environment'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
  vi.unstubAllEnvs()
})

function setEnvironment(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

const complete = {
  DATABASE_URL: 'postgres://user:pass@db.example/neondb',
  BETTER_AUTH_SECRET: 'a-stable-secret',
  NEXT_PUBLIC_APP_URL: 'https://example.com',
  SOFRA_DEMO_MODE: 'false',
  SOFRA_ENABLE_MOCK_PAYMENTS: 'false',
}

describe('validateProductionEnvironment', () => {
  it('accepts a complete configuration', () => {
    setEnvironment(complete)
    expect(validateProductionEnvironment()).toEqual([])
  })

  it('reports a missing auth secret, which would leave sessions unsigned', () => {
    setEnvironment({ ...complete, BETTER_AUTH_SECRET: undefined })
    const problems = validateProductionEnvironment()
    expect(problems.map((p) => p.variable)).toContain('BETTER_AUTH_SECRET')
  })

  it('reports a missing database, which would serve fictional data', () => {
    setEnvironment({ ...complete, DATABASE_URL: undefined })
    expect(validateProductionEnvironment().map((p) => p.variable)).toContain(
      'DATABASE_URL',
    )
  })

  it('refuses demo personas', () => {
    setEnvironment({ ...complete, SOFRA_DEMO_MODE: 'true' })
    expect(validateProductionEnvironment().map((p) => p.variable)).toContain(
      'SOFRA_DEMO_MODE',
    )
  })

  it('refuses the mock payment provider', () => {
    setEnvironment({ ...complete, SOFRA_ENABLE_MOCK_PAYMENTS: 'true' })
    expect(validateProductionEnvironment().map((p) => p.variable)).toContain(
      'SOFRA_ENABLE_MOCK_PAYMENTS',
    )
  })

  it('refuses an insecure app URL', () => {
    setEnvironment({ ...complete, NEXT_PUBLIC_APP_URL: 'http://example.com' })
    expect(validateProductionEnvironment().map((p) => p.variable)).toContain(
      'NEXT_PUBLIC_APP_URL',
    )
  })
})

describe('assertProductionEnvironment', () => {
  it('does nothing outside production, so local work is unaffected', () => {
    vi.stubEnv('NODE_ENV', 'development')
    setEnvironment({ ...complete, BETTER_AUTH_SECRET: undefined })
    expect(() => assertProductionEnvironment()).not.toThrow()
  })

  it('throws in production and names every problem at once', () => {
    vi.stubEnv('NODE_ENV', 'production')
    setEnvironment({
      ...complete,
      BETTER_AUTH_SECRET: undefined,
      DATABASE_URL: undefined,
    })
    expect(() => assertProductionEnvironment()).toThrow(
      /BETTER_AUTH_SECRET[\s\S]*DATABASE_URL|DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/,
    )
  })
})
