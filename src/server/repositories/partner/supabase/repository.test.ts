import { describe, expect, it, vi } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'
import { RepositoryDataError } from '@/server/repositories/errors'

import type {
  PartnerReferralSummaryRow,
  SofraPartnerReadGateway,
} from './gateway'
import { SupabaseSofraPartnerReadRepository } from './repository'

const partner: Actor = {
  id: 'partner-1',
  email: 'partner@sofra.example',
  emailVerified: true,
  roles: ['partner_user'],
  source: 'supabase',
}

const referral: PartnerReferralSummaryRow = {
  organization_id: 'organization-1',
  organization_name: 'Fictional Istanbul Partner',
  organization_code: 'SOFRA-DEMO',
  organization_status: 'active',
  attribution_id: 'attribution-1',
  referral_code: 'SOFRA-DEMO',
  landed_at: '2026-08-01T09:00:00.000Z',
  booking_id: 'booking-1',
  booking_status: 'completed',
  party_size: 2,
  table_slug: 'fictional-table',
  menu_title: 'A fictional household table',
  starts_at: '2026-08-12T16:00:00.000Z',
  public_neighborhood: 'Kadıköy demo cluster',
}

describe('SupabaseSofraPartnerReadRepository', () => {
  it('maps the actor-scoped read model into safe referral metrics', async () => {
    const gateway: SofraPartnerReadGateway = {
      readReferralSummary: async () => [referral],
    }
    const repository = new SupabaseSofraPartnerReadRepository(gateway, partner)
    const overviews = await repository.getReferralOverviews()
    const serialized = JSON.stringify(overviews)

    expect(overviews).toMatchObject([
      {
        attributedVisits: 1,
        attributedBookings: 1,
        completedBookings: 1,
        completedTravelers: 2,
      },
    ])
    expect(serialized).not.toMatch(
      /travelerId|travelerName|primaryTraveler|profile|metadata|commission|settlement|dietary|exactAddress|preciseCoordinate/i,
    )
  })

  it('rejects non-partners before querying the gateway', async () => {
    const readReferralSummary = vi.fn(async () => [referral])
    const repository = new SupabaseSofraPartnerReadRepository(
      { readReferralSummary },
      { ...partner, roles: ['traveler'] },
    )

    await expect(repository.getReferralOverviews()).rejects.toBeInstanceOf(
      AuthorizationError,
    )
    expect(readReferralSummary).not.toHaveBeenCalled()
  })

  it('fails closed on an unknown organization status', async () => {
    const repository = new SupabaseSofraPartnerReadRepository(
      {
        readReferralSummary: async () => [
          {
            ...referral,
            organization_status: 'unknown' as 'active',
          },
        ],
      },
      partner,
    )

    await expect(repository.getReferralOverviews()).rejects.toBeInstanceOf(
      RepositoryDataError,
    )
  })
})
