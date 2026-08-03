import type { CurrencyCode } from '@/features/policy/config'

export const hostedTableStatuses = [
  'draft',
  'submitted',
  'changes_requested',
  'approved',
  'published',
  'minimum_reached',
  'confirmed',
  'roster_locked',
  'completed',
  'cancelled',
  'archived',
] as const

export type HostedTableStatus = (typeof hostedTableStatuses)[number]
export type TableFormat = 'shared' | 'private'

export interface PrivateHostedTableRecord {
  id: string
  slug: string
  householdId: string
  householdName: string
  householdStructure: string
  householdStory: string
  leadHostId: string
  leadHostName: string
  leadHostVerified: boolean
  startsAt: string
  timezone: string
  neighborhood: string
  publicCoordinate: { latitude: number; longitude: number }
  privateAddressId: string
  exactAddress: string
  preciseCoordinate: { latitude: number; longitude: number }
  arrivalInstructions: string
  format: TableFormat
  menuTitle: string
  menuDescription: string
  atmosphere: string
  languages: string[]
  expectedHouseholdParticipants: string
  practicalInformation: string
  accessibilityInformation: string
  proposedCapacity: number
  certifiedCapacity: number
  availableSeats: number
  minimumGuestCount: number
  guaranteedOperation: boolean
  hostNetPayoutKurus: number
  guestPriceKurus: number
  currency: CurrencyCode
  bookingCutoffAt: string
  rosterLockAt: string
  status: HostedTableStatus
  publishedAt: string | null
  cancellationReason: string | null
  joiningPartySummaries: string[]
}

export type PublicHostedTable = Pick<
  PrivateHostedTableRecord,
  | 'id'
  | 'slug'
  | 'householdName'
  | 'householdStructure'
  | 'householdStory'
  | 'leadHostName'
  | 'startsAt'
  | 'timezone'
  | 'neighborhood'
  | 'publicCoordinate'
  | 'format'
  | 'menuTitle'
  | 'menuDescription'
  | 'atmosphere'
  | 'languages'
  | 'expectedHouseholdParticipants'
  | 'practicalInformation'
  | 'accessibilityInformation'
  | 'certifiedCapacity'
  | 'availableSeats'
  | 'minimumGuestCount'
  | 'guaranteedOperation'
  | 'guestPriceKurus'
  | 'currency'
  | 'bookingCutoffAt'
  | 'status'
  | 'joiningPartySummaries'
>
