import 'server-only'

import { RepositoryUnavailableError } from '../errors'
import type {
  HostTableRecord,
  SofraReadRepository,
  TravelerBookingRecord,
} from '../contracts'
import type { SofraReadGateway } from './gateway'
import {
  mapHostCertification,
  mapHostRosterParty,
  mapHostTable,
  mapPublishedTable,
  mapTravelerBooking,
} from './mappers'

export class PostgresSofraReadRepository implements SofraReadRepository {
  constructor(
    private readonly gateway: SofraReadGateway,
    private readonly actorId: string | null = null,
  ) {}

  async listPublicTables() {
    const rows = await this.gateway.readPublishedTables()
    return rows.map(mapPublishedTable)
  }

  async findPublicTableBySlug(slug: string) {
    const row = await this.gateway.readPublishedTableBySlug(slug)
    return row ? mapPublishedTable(row) : undefined
  }

  async listTravelerBookings(): Promise<TravelerBookingRecord[]> {
    this.assertActor()
    const rows = await this.gateway.readTravelerBookings()
    return rows.map(mapTravelerBooking)
  }

  async findTravelerBookingById(id: string) {
    const bookings = await this.listTravelerBookings()
    return bookings.find((booking) => booking.id === id)
  }

  async listHostTables(): Promise<HostTableRecord[]> {
    const actorId = this.assertActor()
    const households = await this.gateway.readOwnedHouseholds(actorId)
    const householdById = new Map(
      households.map((household) => [household.id, household]),
    )
    const rows = await this.gateway.readHostedTables([...householdById.keys()])
    return rows.map((row) => {
      const household = householdById.get(row.household_id)
      if (!household) {
        throw new RepositoryUnavailableError(
          'A hosted table was returned outside the actor household scope',
        )
      }
      return mapHostTable(row, household)
    })
  }

  async findHostTableById(id: string) {
    const tables = await this.listHostTables()
    return tables.find((table) => table.id === id)
  }

  async findHostCertification() {
    const actorId = this.assertActor()
    const households = await this.gateway.readOwnedHouseholds(actorId)
    const rows = await this.gateway.readHostCertifications(
      households.map((household) => household.id),
    )
    const certifications = rows.map(mapHostCertification)
    return (
      certifications.find(
        (certification) => certification.status === 'active',
      ) ?? certifications[0]
    )
  }

  async listHostRoster(tableId: string) {
    const table = await this.findHostTableById(tableId)
    if (!table) {
      throw new RepositoryUnavailableError(
        'The requested table is outside the actor household scope',
      )
    }
    const rows = await this.gateway.readHostRoster(tableId)
    return rows.map((row) => {
      if (row.table_id !== table.id) {
        throw new RepositoryUnavailableError(
          'A roster party was returned outside the requested table scope',
        )
      }
      return mapHostRosterParty(row)
    })
  }

  private assertActor() {
    if (!this.actorId) {
      throw new RepositoryUnavailableError(
        'An authenticated actor is required for this repository operation',
      )
    }
    return this.actorId
  }
}
