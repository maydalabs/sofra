import { describe, expect, it } from 'vitest'

import { DemoSofraReadRepository } from './demo-read-repository'
import { RepositoryUnavailableError } from './errors'

describe('DemoSofraReadRepository', () => {
  it('returns only public projections for anonymous discovery', async () => {
    const repository = new DemoSofraReadRepository()
    const tables = await repository.listPublicTables()
    const serialized = JSON.stringify(tables)

    expect(tables.length).toBeGreaterThan(0)
    expect(serialized).not.toMatch(
      /exactAddress|preciseCoordinate|arrivalInstructions|privateAddressId/i,
    )
  })

  it('strips private address material from the host table boundary', async () => {
    const repository = new DemoSofraReadRepository('demo-host')
    const tables = await repository.listHostTables()
    const serialized = JSON.stringify(tables)

    expect(tables.length).toBeGreaterThan(0)
    expect(serialized).not.toMatch(
      /exactAddress|preciseCoordinate|arrivalInstructions|privateAddressId/i,
    )
  })

  it('rejects protected reads without an actor', async () => {
    const repository = new DemoSofraReadRepository()
    await expect(repository.listTravelerBookings()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
    await expect(repository.listHostTables()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
  })
})
