import { describe, expect, it } from 'vitest'

import type { PartnerReferralProjectionInput } from './referrals'
import { buildPartnerReferralOverviews } from './referrals'

const organization = {
  organizationId: 'partner-1',
  organizationName: 'Fictional Istanbul Partner',
  organizationCode: 'SOFRA-DEMO',
  organizationStatus: 'active' as const,
}

function row(
  input: Partial<PartnerReferralProjectionInput>,
): PartnerReferralProjectionInput {
  return {
    ...organization,
    attributionId: 'attribution-1',
    referralCode: 'SOFRA-DEMO',
    landedAt: '2026-08-20T10:00:00.000Z',
    bookingId: null,
    bookingStatus: null,
    partySize: null,
    tableSlug: null,
    menuTitle: null,
    startsAt: null,
    neighborhood: null,
    ...input,
  }
}

describe('partner referral overview', () => {
  it('separates landing, booking, completion, and closed stages', () => {
    const [overview] = buildPartnerReferralOverviews([
      row({ attributionId: 'landing' }),
      row({
        attributionId: 'booked',
        bookingId: 'booking-1',
        bookingStatus: 'confirmed',
        partySize: 2,
      }),
      row({
        attributionId: 'completed',
        bookingId: 'booking-2',
        bookingStatus: 'completed',
        partySize: 3,
      }),
      row({
        attributionId: 'closed',
        bookingId: 'booking-3',
        bookingStatus: 'cancelled',
        partySize: 1,
      }),
    ])

    expect(overview.activity.map((activity) => activity.stage)).toEqual([
      'landed',
      'booked',
      'completed',
      'closed',
    ])
    expect(overview).toMatchObject({
      attributedVisits: 4,
      attributedBookings: 3,
      completedBookings: 1,
      completedTravelers: 3,
    })
  })

  it('counts each attribution and booking once when read rows repeat', () => {
    const repeated = row({
      bookingId: 'booking-1',
      bookingStatus: 'completed',
      partySize: 2,
    })
    const [overview] = buildPartnerReferralOverviews([repeated, repeated])

    expect(overview).toMatchObject({
      attributedVisits: 1,
      attributedBookings: 1,
      completedBookings: 1,
      completedTravelers: 2,
    })
  })

  it('retains an organization with no referral activity', () => {
    const [overview] = buildPartnerReferralOverviews([
      row({
        attributionId: null,
        referralCode: null,
        landedAt: null,
      }),
    ])

    expect(overview.activity).toEqual([])
    expect(overview.attributedVisits).toBe(0)
  })
})
