import 'server-only'

export type DemoCompatibilityStatus =
  'accepted' | 'review_required' | 'not_required'

export interface DemoRosterParty {
  bookingId: string
  publicContext: string
  partySize: number
  bookingStatus: 'pending_minimum' | 'confirmed'
  compatibilityStatus: DemoCompatibilityStatus
  paymentStatus: 'authorized'
}

const rosters: Record<string, readonly DemoRosterParty[]> = {
  'table-mercimek-kadikoy': [
    {
      bookingId: 'booking-demo-pending',
      publicContext: 'One solo traveler visiting Istanbul',
      partySize: 1,
      bookingStatus: 'pending_minimum',
      compatibilityStatus: 'accepted',
      paymentStatus: 'authorized',
    },
    {
      bookingId: 'booking-demo-couple',
      publicContext: 'A couple traveling together',
      partySize: 2,
      bookingStatus: 'confirmed',
      compatibilityStatus: 'not_required',
      paymentStatus: 'authorized',
    },
  ],
}

export function getDemoRoster(tableId: string) {
  return rosters[tableId] ?? []
}
