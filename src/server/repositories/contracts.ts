import type {
  BookingStatus,
  CertificationStatus,
  CompatibilityStatus,
  PaymentStatus,
} from '@/server/database/database.types'
import type {
  PublicHostedTable,
  PrivateHostedTableRecord,
} from '@/features/hosted-tables/types'

export interface TravelerBookingRecord {
  id: string
  tableId: string
  tableSlug: string
  menuTitle: string
  householdName: string
  startsAt: string
  neighborhood: string
  partySize: number
  partyType: string
  status: BookingStatus
  compatibilityStatus: CompatibilityStatus
  paymentStatus: PaymentStatus
  guestTotalKurus: number
}

export type HostTableRecord = Omit<
  PrivateHostedTableRecord,
  | 'privateAddressId'
  | 'exactAddress'
  | 'preciseCoordinate'
  | 'arrivalInstructions'
  | 'leadHostName'
  | 'leadHostVerified'
  | 'joiningPartySummaries'
>

export interface HostCertificationRecord {
  id: string
  householdId: string
  status: CertificationStatus
  certifiedTravelerCapacity: number
  validFrom: string | null
  validUntil: string | null
}

export interface HostRosterPartyRecord {
  bookingId: string
  tableId: string
  partySize: number
  bookingStatus: Extract<BookingStatus, 'confirmed' | 'completed'>
  compatibilityStatus: CompatibilityStatus
}

export interface HostOwnAddressRecord {
  addressLine1: string
  dwellingType: string | null
  addressLine2: string | null
  district: string
  city: string
  postalCode: string | null
  arrivalInstructions: string | null
  verifiedAt: string | null
}

export interface SofraReadRepository {
  listPublicTables(): Promise<PublicHostedTable[]>
  findPublicTableBySlug(slug: string): Promise<PublicHostedTable | undefined>
  listTravelerBookings(): Promise<TravelerBookingRecord[]>
  findTravelerBookingById(
    id: string,
  ): Promise<TravelerBookingRecord | undefined>
  listHostTables(): Promise<HostTableRecord[]>
  findHostTableById(id: string): Promise<HostTableRecord | undefined>
  findHostCertification(): Promise<HostCertificationRecord | undefined>
  /** The host's own household address. Never anyone else's. */
  findOwnHouseholdAddress(): Promise<HostOwnAddressRecord | undefined>
  listHostRoster(tableId: string): Promise<HostRosterPartyRecord[]>
}
