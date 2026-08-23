import 'server-only'

import type { HostRosterPartyRecord } from '@/server/repositories/contracts'

const rosters: Record<string, readonly HostRosterPartyRecord[]> = {
  'table-mercimek-kadikoy': [
    {
      bookingId: 'booking-demo-couple',
      tableId: 'table-mercimek-kadikoy',
      partySize: 2,
      bookingStatus: 'confirmed',
      compatibilityStatus: 'not_required',
    },
  ],
}

export function getDemoRoster(tableId: string) {
  return [...(rosters[tableId] ?? [])]
}
