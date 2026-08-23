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

  it('returns only delivery-safe data for the owned host roster', async () => {
    const repository = new DemoSofraReadRepository('demo-host')
    const roster = await repository.listHostRoster('table-mercimek-kadikoy')
    const serialized = JSON.stringify(roster)

    expect(roster).toMatchObject([{ partySize: 2, bookingStatus: 'confirmed' }])
    expect(serialized).not.toMatch(
      /name|dietary|address|coordinate|payment|publicContext/i,
    )
  })

  it('rejects roster access outside the demo host household', async () => {
    const repository = new DemoSofraReadRepository('demo-host')
    await expect(
      repository.listHostRoster('table-nermin-selma-uskudar'),
    ).rejects.toBeInstanceOf(RepositoryUnavailableError)
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
