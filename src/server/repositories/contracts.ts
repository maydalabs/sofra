import type {
  BookingStatus,
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

export interface SofraReadRepository {
  listPublicTables(): Promise<PublicHostedTable[]>
  findPublicTableBySlug(slug: string): Promise<PublicHostedTable | undefined>
  listTravelerBookings(): Promise<TravelerBookingRecord[]>
  findTravelerBookingById(
    id: string,
  ): Promise<TravelerBookingRecord | undefined>
  listHostTables(): Promise<HostTableRecord[]>
  findHostTableById(id: string): Promise<HostTableRecord | undefined>
}
