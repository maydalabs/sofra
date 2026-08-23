import 'server-only'

import { getDemoBookings } from '@/features/bookings/demo-bookings'
import {
  getPrivateDemoTables,
  getPublicDemoTables,
} from '@/features/hosted-tables/demo-tables'
import type { PrivateHostedTableRecord } from '@/features/hosted-tables/types'

import { RepositoryUnavailableError } from './errors'
import type {
  HostTableRecord,
  SofraReadRepository,
  TravelerBookingRecord,
} from './contracts'

function toHostTableRecord(table: PrivateHostedTableRecord): HostTableRecord {
  return {
    id: table.id,
    slug: table.slug,
    householdId: table.householdId,
    householdName: table.householdName,
    householdStructure: table.householdStructure,
    householdStory: table.householdStory,
    leadHostId: table.leadHostId,
    startsAt: table.startsAt,
    timezone: table.timezone,
    neighborhood: table.neighborhood,
    publicCoordinate: table.publicCoordinate,
    format: table.format,
    menuTitle: table.menuTitle,
    menuDescription: table.menuDescription,
    atmosphere: table.atmosphere,
    languages: table.languages,
    expectedHouseholdParticipants: table.expectedHouseholdParticipants,
    practicalInformation: table.practicalInformation,
    accessibilityInformation: table.accessibilityInformation,
    proposedCapacity: table.proposedCapacity,
    certifiedCapacity: table.certifiedCapacity,
    availableSeats: table.availableSeats,
    minimumGuestCount: table.minimumGuestCount,
    guaranteedOperation: table.guaranteedOperation,
    hostNetPayoutKurus: table.hostNetPayoutKurus,
    guestPriceKurus: table.guestPriceKurus,
    currency: table.currency,
    bookingCutoffAt: table.bookingCutoffAt,
    rosterLockAt: table.rosterLockAt,
    status: table.status,
    publishedAt: table.publishedAt,
    cancellationReason: table.cancellationReason,
  }
}

export class DemoSofraReadRepository implements SofraReadRepository {
  constructor(private readonly actorId: string | null = null) {}

  async listPublicTables() {
    return getPublicDemoTables()
  }

  async findPublicTableBySlug(slug: string) {
    return getPublicDemoTables().find((table) => table.slug === slug)
  }

  async listTravelerBookings(): Promise<TravelerBookingRecord[]> {
    this.assertAuthenticatedDemoActor()
    return getDemoBookings()
  }

  async findTravelerBookingById(id: string) {
    const bookings = await this.listTravelerBookings()
    return bookings.find((booking) => booking.id === id)
  }

  async listHostTables() {
    if (this.actorId !== 'demo-host') {
      throw new RepositoryUnavailableError(
        'The demo host repository requires the certified-host persona',
      )
    }
    return getPrivateDemoTables()
      .filter((table) => table.householdId === 'household-ayse-levent')
      .map(toHostTableRecord)
  }

  async findHostTableById(id: string) {
    const tables = await this.listHostTables()
    return tables.find((table) => table.id === id)
  }

  private assertAuthenticatedDemoActor() {
    if (!this.actorId?.startsWith('demo-')) {
      throw new RepositoryUnavailableError(
        'The demo traveler repository requires a demo persona',
      )
    }
  }
}
