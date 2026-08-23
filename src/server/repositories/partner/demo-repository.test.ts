import { describe, expect, it } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'

import { DemoSofraPartnerReadRepository } from './demo-repository'

const partner: Actor = {
  id: 'demo-partner',
  email: 'partner@sofra.example',
  emailVerified: true,
  roles: ['partner_user'],
  source: 'demo',
}

describe('DemoSofraPartnerReadRepository', () => {
  it('returns a partner-owned referral summary without traveler or commercial data', async () => {
    const repository = new DemoSofraPartnerReadRepository(partner)
    const overviews = await repository.getReferralOverviews()
    const serialized = JSON.stringify(overviews)

    expect(overviews).toMatchObject([
      {
        organizationCode: 'SOFRA-DEMO',
        attributedVisits: 3,
        attributedBookings: 2,
        completedBookings: 1,
        completedTravelers: 2,
      },
    ])
    expect(serialized).not.toMatch(
      /travelerId|travelerName|primaryTraveler|profile|metadata|commission|settlement|dietary|exactAddress|preciseCoordinate/i,
    )
  })

  it('rejects a non-partner actor', async () => {
    const repository = new DemoSofraPartnerReadRepository({
      ...partner,
      roles: ['traveler'],
    })

    await expect(repository.getReferralOverviews()).rejects.toBeInstanceOf(
      AuthorizationError,
    )
  })
})
