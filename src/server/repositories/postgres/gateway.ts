import 'server-only'

import type { Database } from '@/server/database/database.types'
import type { SofraDatabase } from '@/server/database/client'
import { RepositoryQueryError } from '../errors'

export type PublishedTableRow =
  Database['public']['Views']['published_hosted_tables']['Row']
export type TravelerBookingRow =
  Database['public']['Functions']['get_booking_summaries']['Returns'][number]
export type HouseholdRow = Database['public']['Tables']['households']['Row']
export type HostedTableRow =
  Database['public']['Tables']['hosted_tables']['Row']
export type HostCertificationRow = Pick<
  Database['public']['Tables']['host_certifications']['Row'],
  | 'id'
  | 'household_id'
  | 'status'
  | 'certified_traveler_capacity'
  | 'valid_from'
  | 'valid_until'
>
export type HostOwnAddressRow = Pick<
  Database['public']['Tables']['household_private_addresses']['Row'],
  | 'address_line_1'
  | 'address_line_2'
  | 'district'
  | 'city'
  | 'postal_code'
  | 'arrival_instructions'
  | 'verified_at'
>
export type HostRosterRow =
  Database['public']['Functions']['get_host_roster']['Returns'][number]

export interface SofraReadGateway {
  readPublishedTables(): Promise<PublishedTableRow[]>
  readPublishedTableBySlug(slug: string): Promise<PublishedTableRow | undefined>
  readTravelerBookings(): Promise<TravelerBookingRow[]>
  readOwnedHouseholds(ownerProfileId: string): Promise<HouseholdRow[]>
  readHostedTables(householdIds: readonly string[]): Promise<HostedTableRow[]>
  readHostCertifications(
    householdIds: readonly string[],
  ): Promise<HostCertificationRow[]>
  readHostRoster(tableId: string): Promise<HostRosterRow[]>
  readOwnAddress(): Promise<HostOwnAddressRow | undefined>
}

/**
 * Every query is scoped by the actor id held here, never by a value taken from
 * a caller. Authorization was previously enforced by row-level security using
 * the database session's identity; it is now enforced by this boundary plus the
 * role checks in the repository factories.
 */
export class PostgresReadGateway implements SofraReadGateway {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string | null = null,
  ) {}

  private requireActor(operation: string) {
    if (!this.actorId) {
      throw new RepositoryQueryError(operation, 'no authenticated actor')
    }
    return this.actorId
  }

  private async run<T>(operation: string, query: () => Promise<T>) {
    try {
      return await query()
    } catch (error) {
      throw new RepositoryQueryError(
        operation,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  async readPublishedTables() {
    return this.run('list public tables', async () => {
      const rows = await this.sql<PublishedTableRow[]>`
        select * from public.published_hosted_tables
        order by starts_at asc
      `
      return [...rows]
    })
  }

  async readPublishedTableBySlug(slug: string) {
    return this.run('find public table', async () => {
      const rows = await this.sql<PublishedTableRow[]>`
        select * from public.published_hosted_tables
        where slug = ${slug}
        limit 1
      `
      return rows[0]
    })
  }

  async readTravelerBookings() {
    const actorId = this.requireActor('list traveler bookings')
    return this.run('list traveler bookings', async () => {
      const rows = await this.sql<TravelerBookingRow[]>`
        select * from public.get_booking_summaries(${actorId}::uuid)
      `
      return [...rows]
    })
  }

  async readOwnedHouseholds(ownerProfileId: string) {
    return this.run('list owned households', async () => {
      const rows = await this.sql<HouseholdRow[]>`
        select * from public.households
        where owner_profile_id = ${ownerProfileId}::uuid
      `
      return [...rows]
    })
  }

  async readHostedTables(householdIds: readonly string[]) {
    if (!householdIds.length) return []
    return this.run('list hosted tables', async () => {
      const rows = await this.sql<HostedTableRow[]>`
        select * from public.hosted_tables
        where household_id = any(${this.sql.array([...householdIds])}::uuid[])
        order by starts_at asc
      `
      return [...rows]
    })
  }

  async readHostCertifications(householdIds: readonly string[]) {
    if (!householdIds.length) return []
    return this.run('find host certification', async () => {
      const rows = await this.sql<HostCertificationRow[]>`
        select id, household_id, status, certified_traveler_capacity,
               valid_from, valid_until
        from public.host_certifications
        where household_id = any(${this.sql.array([...householdIds])}::uuid[])
        order by created_at desc
      `
      return [...rows]
    })
  }

  async readOwnAddress() {
    const actorId = this.requireActor('read own address')
    return this.run('read own address', async () => {
      const rows = await this.sql<HostOwnAddressRow[]>`
        select a.address_line_1, a.address_line_2, a.district, a.city,
               a.postal_code, a.arrival_instructions, a.verified_at
        from public.household_private_addresses a
        join public.households h on h.id = a.household_id
        where h.owner_profile_id = ${actorId}::uuid
        order by h.created_at
        limit 1
      `
      return rows[0]
    })
  }

  async readHostRoster(tableId: string) {
    const actorId = this.requireActor('list host roster')
    return this.run('list host roster', async () => {
      const rows = await this.sql<HostRosterRow[]>`
        select * from public.get_host_roster(${tableId}::uuid, ${actorId}::uuid)
      `
      return [...rows]
    })
  }
}
