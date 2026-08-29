import { describe, expect, it } from 'vitest'

import { RepositoryDataError, RepositoryUnavailableError } from '../errors'
import type {
  HostCertificationRow,
  HostRosterRow,
  HostedTableRow,
  HouseholdRow,
  PublishedTableRow,
  SofraReadGateway,
  TravelerBookingRow,
} from './gateway'
import { PostgresSofraReadRepository } from './read-repository'

const publicRow: PublishedTableRow = {
  id: 'table-1',
  slug: 'household-sunday',
  household_name: 'A household table',
  household_story: 'A fictional public story.',
  household_structure: 'Two adult hosts',
  lead_host_name: 'Demo host',
  starts_at: '2026-09-20T16:00:00.000Z',
  timezone: 'Europe/Istanbul',
  public_neighborhood: 'Kadıköy demo cluster',
  public_approximate_latitude: 40.99,
  public_approximate_longitude: 29.03,
  format: 'shared',
  menu_title: 'A Sunday table',
  menu_description: 'Soup, vegetables, a main dish, dessert, and tea.',
  atmosphere: 'Unhurried',
  languages: ['Turkish', 'English'],
  expected_household_participants: 'Two verified hosts',
  practical_information: 'Shoes remain near the entrance.',
  accessibility_information: 'Lift access.',
  certified_capacity: 4,
  available_seats: 2,
  minimum_guest_count: 2,
  guaranteed_operation: false,
  guest_price_kurus: 150_000,
  currency: 'TRY',
  booking_cutoff_at: '2026-09-19T04:00:00.000Z',
  status: 'published',
}

const bookingRow: TravelerBookingRow = {
  id: 'booking-1',
  table_id: 'table-1',
  table_slug: 'household-sunday',
  menu_title: 'A Sunday table',
  household_name: 'A household table',
  starts_at: '2026-09-20T16:00:00.000Z',
  public_neighborhood: 'Kadıköy demo cluster',
  party_size: 1,
  party_type: 'solo',
  status: 'confirmed',
  compatibility_status: 'accepted',
  payment_status: 'authorized',
  guest_total_kurus: 150_000,
}

const householdRow: HouseholdRow = {
  id: 'household-1',
  owner_profile_id: 'actor-1',
  public_name: 'A household table',
  household_structure: 'Two adult hosts',
  public_story: 'A fictional public story.',
  atmosphere: null,
  status: 'certified',
  created_at: '2026-08-24T00:00:00.000Z',
  updated_at: '2026-08-24T00:00:00.000Z',
}

const hostedTableRow: HostedTableRow = {
  id: 'table-1',
  slug: 'household-sunday',
  household_id: 'household-1',
  lead_verified_host_id: 'actor-1',
  private_address_id: 'private-address-never-mapped',
  pricing_policy_id: 'policy-1',
  starts_at: '2026-09-20T16:00:00.000Z',
  timezone: 'Europe/Istanbul',
  public_neighborhood: 'Kadıköy demo cluster',
  public_approximate_latitude: 40.99,
  public_approximate_longitude: 29.03,
  format: 'shared',
  menu_title: 'A Sunday table',
  menu_description: 'Soup, vegetables, a main dish, dessert, and tea.',
  atmosphere: 'Unhurried',
  languages: ['Turkish', 'English'],
  expected_household_participants: 'Two verified hosts',
  practical_information: 'Shoes remain near the entrance.',
  accessibility_information: 'Lift access.',
  proposed_capacity: 4,
  certified_capacity: 4,
  available_seats: 2,
  minimum_guest_count: 2,
  guaranteed_operation: false,
  host_net_payout_kurus: 120_000,
  guest_price_kurus: 150_000,
  currency: 'TRY',
  booking_cutoff_at: '2026-09-19T04:00:00.000Z',
  roster_lock_at: '2026-09-19T16:00:00.000Z',
  status: 'published',
  published_at: '2026-08-24T00:00:00.000Z',
  cancelled_at: null,
  cancellation_reason: null,
  created_at: '2026-08-24T00:00:00.000Z',
  updated_at: '2026-08-24T00:00:00.000Z',
}

const certificationRow: HostCertificationRow = {
  id: 'certification-1',
  household_id: 'household-1',
  status: 'active',
  certified_traveler_capacity: 4,
  valid_from: '2026-01-01T00:00:00.000Z',
  valid_until: null,
}

const rosterRow: HostRosterRow = {
  id: 'booking-1',
  table_id: 'table-1',
  party_size: 2,
  status: 'confirmed',
  compatibility_status: 'accepted',
}

function createGateway(
  overrides: Partial<SofraReadGateway> = {},
): SofraReadGateway {
  return {
    readPublishedTables: async () => [publicRow],
    readPublishedTableBySlug: async (slug) =>
      slug === publicRow.slug ? publicRow : undefined,
    readTravelerBookings: async () => [bookingRow],
    readOwnAddress: async () => undefined,
    readOwnedHouseholds: async () => [householdRow],
    readHostedTables: async () => [hostedTableRow],
    readHostCertifications: async () => [certificationRow],
    readHostRoster: async () => [rosterRow],
    ...overrides,
  }
}

describe('PostgresSofraReadRepository', () => {
  it('maps the anonymous allowlist without inventing private fields', async () => {
    const repository = new PostgresSofraReadRepository(createGateway())
    const tables = await repository.listPublicTables()

    expect(tables).toHaveLength(1)
    expect(tables[0]).toMatchObject({
      id: 'table-1',
      neighborhood: 'Kadıköy demo cluster',
      currency: 'TRY',
    })
    expect(JSON.stringify(tables)).not.toMatch(
      /private_address|exactAddress|arrivalInstructions/i,
    )
  })

  it('maps authenticated traveler and household-scoped host reads', async () => {
    const repository = new PostgresSofraReadRepository(
      createGateway(),
      'actor-1',
    )

    await expect(repository.listTravelerBookings()).resolves.toMatchObject([
      { id: 'booking-1', compatibilityStatus: 'accepted' },
    ])
    await expect(repository.listHostTables()).resolves.toMatchObject([
      { id: 'table-1', householdId: 'household-1' },
    ])
    await expect(repository.findHostCertification()).resolves.toMatchObject({
      status: 'active',
      certifiedTravelerCapacity: 4,
    })
    await expect(repository.listHostRoster('table-1')).resolves.toMatchObject([
      {
        bookingId: 'booking-1',
        partySize: 2,
        compatibilityStatus: 'accepted',
      },
    ])
  })

  it('fails closed when protected reads have no actor', async () => {
    const repository = new PostgresSofraReadRepository(createGateway())
    await expect(repository.listTravelerBookings()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
    await expect(repository.listHostTables()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
    await expect(repository.findHostCertification()).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
  })

  it('rejects roster rows outside the requested host-owned table', async () => {
    const repository = new PostgresSofraReadRepository(
      createGateway({
        readHostRoster: async () => [
          { ...rosterRow, table_id: 'table-outside-scope' },
        ],
      }),
      'actor-1',
    )

    await expect(repository.listHostRoster('table-1')).rejects.toBeInstanceOf(
      RepositoryUnavailableError,
    )
  })

  it('rejects non-confirmed records at the host roster mapper boundary', async () => {
    const repository = new PostgresSofraReadRepository(
      createGateway({
        readHostRoster: async () => [
          { ...rosterRow, status: 'pending_minimum' },
        ],
      }),
      'actor-1',
    )

    await expect(repository.listHostRoster('table-1')).rejects.toBeInstanceOf(
      RepositoryDataError,
    )
  })

  it('rejects incomplete public-view records', async () => {
    const repository = new PostgresSofraReadRepository(
      createGateway({
        readPublishedTables: async () => [
          { ...publicRow, public_neighborhood: null },
        ],
      }),
    )
    await expect(repository.listPublicTables()).rejects.toBeInstanceOf(
      RepositoryDataError,
    )
  })
})
