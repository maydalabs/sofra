import type { PartnerReferralProjectionInput } from '@/features/partners/referrals'

const organization = {
  organizationId: 'partner-organization-demo',
  organizationName: 'Fictional Istanbul Partner',
  organizationCode: 'SOFRA-DEMO',
  organizationStatus: 'active' as const,
}

const partnerReferralRows: readonly PartnerReferralProjectionInput[] = [
  {
    ...organization,
    attributionId: 'partner-attribution-landing',
    referralCode: 'SOFRA-DEMO',
    landedAt: '2026-08-23T09:30:00.000Z',
    bookingId: null,
    bookingStatus: null,
    partySize: null,
    tableSlug: null,
    menuTitle: null,
    startsAt: null,
    neighborhood: null,
  },
  {
    ...organization,
    attributionId: 'partner-attribution-booked',
    referralCode: 'SOFRA-DEMO',
    landedAt: '2026-08-18T13:15:00.000Z',
    bookingId: 'booking-partner-confirmed',
    bookingStatus: 'confirmed',
    partySize: 2,
    tableSlug: 'ozdemir-three-generations',
    menuTitle: 'Three generations, one table',
    startsAt: '2026-09-13T16:30:00.000Z',
    neighborhood: 'Teşvikiye, Şişli',
  },
  {
    ...organization,
    attributionId: 'partner-attribution-completed',
    referralCode: 'SOFRA-DEMO',
    landedAt: '2026-07-25T11:00:00.000Z',
    bookingId: 'booking-partner-completed',
    bookingStatus: 'completed',
    partySize: 2,
    tableSlug: 'cem-figen-bosphorus-evening',
    menuTitle: 'An Istanbul neighborhood table at home',
    startsAt: '2026-08-09T16:30:00.000Z',
    neighborhood: 'Abbasağa, Beşiktaş',
  },
]

export function getDemoPartnerReferralRows() {
  return partnerReferralRows.map((row) => ({ ...row }))
}
