import type { PublicHostedTable } from '@/features/hosted-tables/types'

import { RepositoryDataError } from '../errors'
import type {
  HostCertificationRecord,
  HostRosterPartyRecord,
  HostTableRecord,
  TravelerBookingRecord,
} from '../contracts'
import type {
  HostCertificationRow,
  HostRosterRow,
  HostedTableRow,
  HouseholdRow,
  PublishedTableRow,
  TravelerBookingRow,
} from './gateway'

function required<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined)
    throw new RepositoryDataError(field)
  return value
}

export function mapPublishedTable(row: PublishedTableRow): PublicHostedTable {
  return {
    id: required(row.id, 'published_hosted_tables.id'),
    slug: required(row.slug, 'published_hosted_tables.slug'),
    householdName: required(
      row.household_name,
      'published_hosted_tables.household_name',
    ),
    householdStructure: required(
      row.household_structure,
      'published_hosted_tables.household_structure',
    ),
    householdStory: required(
      row.household_story,
      'published_hosted_tables.household_story',
    ),
    leadHostName: required(
      row.lead_host_name,
      'published_hosted_tables.lead_host_name',
    ),
    startsAt: required(row.starts_at, 'published_hosted_tables.starts_at'),
    timezone: required(row.timezone, 'published_hosted_tables.timezone'),
    neighborhood: required(
      row.public_neighborhood,
      'published_hosted_tables.public_neighborhood',
    ),
    publicCoordinate: {
      latitude: required(
        row.public_approximate_latitude,
        'published_hosted_tables.public_approximate_latitude',
      ),
      longitude: required(
        row.public_approximate_longitude,
        'published_hosted_tables.public_approximate_longitude',
      ),
    },
    format: required(row.format, 'published_hosted_tables.format'),
    menuTitle: required(row.menu_title, 'published_hosted_tables.menu_title'),
    menuDescription: required(
      row.menu_description,
      'published_hosted_tables.menu_description',
    ),
    atmosphere: required(row.atmosphere, 'published_hosted_tables.atmosphere'),
    languages: required(row.languages, 'published_hosted_tables.languages'),
    expectedHouseholdParticipants: required(
      row.expected_household_participants,
      'published_hosted_tables.expected_household_participants',
    ),
    practicalInformation: required(
      row.practical_information,
      'published_hosted_tables.practical_information',
    ),
    accessibilityInformation: required(
      row.accessibility_information,
      'published_hosted_tables.accessibility_information',
    ),
    certifiedCapacity: required(
      row.certified_capacity,
      'published_hosted_tables.certified_capacity',
    ),
    availableSeats: required(
      row.available_seats,
      'published_hosted_tables.available_seats',
    ),
    minimumGuestCount: required(
      row.minimum_guest_count,
      'published_hosted_tables.minimum_guest_count',
    ),
    guaranteedOperation: required(
      row.guaranteed_operation,
      'published_hosted_tables.guaranteed_operation',
    ),
    guestPriceKurus: required(
      row.guest_price_kurus,
      'published_hosted_tables.guest_price_kurus',
    ),
    currency: required(row.currency, 'published_hosted_tables.currency'),
    bookingCutoffAt: required(
      row.booking_cutoff_at,
      'published_hosted_tables.booking_cutoff_at',
    ),
    status: required(row.status, 'published_hosted_tables.status'),
    joiningPartySummaries: [],
  }
}

export function mapTravelerBooking(
  row: TravelerBookingRow,
): TravelerBookingRecord {
  return {
    id: row.id,
    tableId: row.table_id,
    tableSlug: row.table_slug,
    menuTitle: row.menu_title,
    householdName: row.household_name,
    startsAt: row.starts_at,
    neighborhood: row.public_neighborhood,
    partySize: row.party_size,
    partyType: row.party_type,
    status: row.status,
    compatibilityStatus: row.compatibility_status,
    paymentStatus: row.payment_status,
    guestTotalKurus: row.guest_total_kurus,
  }
}

export function mapHostTable(
  row: HostedTableRow,
  household: HouseholdRow,
): HostTableRecord {
  return {
    id: row.id,
    slug: row.slug,
    householdId: household.id,
    householdName: household.public_name,
    householdStructure: household.household_structure,
    householdStory: household.public_story,
    leadHostId: row.lead_verified_host_id,
    startsAt: row.starts_at,
    timezone: row.timezone,
    neighborhood: row.public_neighborhood,
    publicCoordinate: {
      latitude: required(
        row.public_approximate_latitude,
        'hosted_tables.public_approximate_latitude',
      ),
      longitude: required(
        row.public_approximate_longitude,
        'hosted_tables.public_approximate_longitude',
      ),
    },
    format: row.format,
    menuTitle: row.menu_title,
    menuDescription: row.menu_description,
    atmosphere: row.atmosphere,
    languages: row.languages,
    expectedHouseholdParticipants: row.expected_household_participants,
    practicalInformation: row.practical_information,
    accessibilityInformation: row.accessibility_information,
    proposedCapacity: row.proposed_capacity,
    certifiedCapacity: row.certified_capacity,
    availableSeats: row.available_seats,
    minimumGuestCount: row.minimum_guest_count,
    guaranteedOperation: row.guaranteed_operation,
    hostNetPayoutKurus: row.host_net_payout_kurus,
    guestPriceKurus: row.guest_price_kurus,
    currency: row.currency,
    bookingCutoffAt: row.booking_cutoff_at,
    rosterLockAt: row.roster_lock_at,
    status: row.status,
    publishedAt: row.published_at,
    cancellationReason: row.cancellation_reason,
  }
}

export function mapHostCertification(
  row: HostCertificationRow,
): HostCertificationRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    status: row.status,
    certifiedTravelerCapacity: row.certified_traveler_capacity,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
  }
}

export function mapHostRosterParty(row: HostRosterRow): HostRosterPartyRecord {
  if (row.status !== 'confirmed' && row.status !== 'completed') {
    throw new RepositoryDataError('get_my_host_roster.status')
  }
  return {
    bookingId: row.id,
    tableId: row.table_id,
    partySize: row.party_size,
    bookingStatus: row.status,
    compatibilityStatus: row.compatibility_status,
  }
}
