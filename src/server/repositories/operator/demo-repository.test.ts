import { describe, expect, it } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'

import { DemoSofraOperatorReadRepository } from './demo-repository'

const operator: Actor = {
  id: 'demo-operator',
  email: 'operator@sofra.example',
  emailVerified: true,
  roles: ['operator'],
  source: 'demo',
}

describe('DemoSofraOperatorReadRepository', () => {
  it('returns the complete fictional operator queues', async () => {
    const repository = new DemoSofraOperatorReadRepository(operator)

    await expect(repository.listHostApplications()).resolves.toHaveLength(1)
    await expect(repository.listTableReviews()).resolves.not.toHaveLength(0)
    await expect(repository.listBookings()).resolves.toHaveLength(3)
    await expect(repository.listIncidents()).resolves.toMatchObject([
      { payoutHeld: true, relatedPayoutId: 'demo-payout-held' },
    ])
    await expect(repository.listPayouts()).resolves.toMatchObject([
      { status: 'held', incidentStatus: 'open' },
      { status: 'eligible', incidentStatus: 'none' },
    ])
    await expect(repository.listAuditEvents()).resolves.toHaveLength(3)
  })

  it('does not place unrelated sensitive categories into table or booking records', async () => {
    const repository = new DemoSofraOperatorReadRepository(operator)
    const records = JSON.stringify({
      tables: await repository.listTableReviews(),
      bookings: await repository.listBookings(),
    })

    expect(records).not.toMatch(
      /exactAddress|preciseCoordinate|privateAddressId|arrivalInstructions|dietary|guestName/i,
    )
  })

  it('rejects reads when constructed with a non-operator actor', async () => {
    const repository = new DemoSofraOperatorReadRepository({
      ...operator,
      roles: ['traveler'],
    })

    await expect(repository.listIncidents()).rejects.toBeInstanceOf(
      AuthorizationError,
    )
  })
})
