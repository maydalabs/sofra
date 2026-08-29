import 'server-only'

import type { Actor } from '@/server/authorization/roles'
import { assertHasAnyRole } from '@/server/authorization/roles'
import { RepositoryDataError } from '@/server/repositories/errors'
import type { SofraOperatorReadRepository } from '@/server/repositories/operator/contracts'

import type {
  OperatorHostedTableRow,
  SofraOperatorReadGateway,
} from './gateway'
import {
  mapOperatorAudit,
  mapOperatorBooking,
  mapOperatorHostApplication,
  mapOperatorIncident,
  mapOperatorPayout,
  mapOperatorTable,
} from './mappers'

const openIncidentStatuses = new Set(['open', 'triaged', 'investigating'])

export class PostgresSofraOperatorReadRepository implements SofraOperatorReadRepository {
  constructor(
    private readonly gateway: SofraOperatorReadGateway,
    private readonly actor: Actor,
  ) {}

  async listCompatibilityQueue() {
    this.assertOperator()
    const rows = await this.gateway.readCompatibilityQueue()
    return rows.map((row) => ({
      bookingId: row.booking_id,
      tableLabel: `${row.menu_title} · ${row.public_neighborhood}`,
      startsAt: row.starts_at,
      partySize: row.party_size,
      disclosure: row.explanation,
      disclosedAt: row.disclosed_at,
    }))
  }

  async listPendingReviews() {
    this.assertOperator()
    const rows = await this.gateway.readPendingReviews()
    return rows.map((row) => ({
      id: row.id,
      tableLabel: `${row.menu_title} · ${row.public_neighborhood}`,
      rating: row.rating,
      title: row.title,
      body: row.body,
      submittedAt: row.created_at,
    }))
  }

  async listHostApplications() {
    this.assertOperator()
    const applications = await this.gateway.readHostApplications()
    const profiles = await this.gateway.readProfiles(
      applications.map((application) => application.applicant_profile_id),
    )
    const households = await this.gateway.readHouseholds(
      applications.flatMap((application) =>
        application.household_id ? [application.household_id] : [],
      ),
    )
    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    )
    const householdById = new Map(
      households.map((household) => [household.id, household]),
    )

    return applications.map((application) => {
      const applicant = profileById.get(application.applicant_profile_id)
      if (!applicant) {
        throw new RepositoryDataError(
          `host_applications.${application.id}.applicant_profile`,
        )
      }
      return mapOperatorHostApplication(
        application,
        applicant,
        application.household_id
          ? householdById.get(application.household_id)
          : undefined,
      )
    })
  }

  async findHostApplicationById(id: string) {
    const applications = await this.listHostApplications()
    return applications.find((application) => application.id === id)
  }

  async listTableReviews() {
    this.assertOperator()
    const tables = await this.gateway.readHostedTables()
    const households = await this.gateway.readHouseholds(
      tables.map((table) => table.household_id),
    )
    const householdById = new Map(
      households.map((household) => [household.id, household]),
    )
    return tables.map((table) => {
      const household = householdById.get(table.household_id)
      if (!household) {
        throw new RepositoryDataError(`hosted_tables.${table.id}.household`)
      }
      return mapOperatorTable(table, household)
    })
  }

  async findTableReviewById(id: string) {
    const tables = await this.listTableReviews()
    return tables.find((table) => table.id === id)
  }

  async listBookings() {
    this.assertOperator()
    const [bookings, tables] = await Promise.all([
      this.gateway.readBookings(),
      this.gateway.readHostedTables(),
    ])
    const tableById = indexTables(tables)
    return bookings.map((booking) => {
      const table = tableById.get(booking.hosted_table_id)
      if (!table) {
        throw new RepositoryDataError(`bookings.${booking.id}.hosted_table`)
      }
      return mapOperatorBooking(booking, table)
    })
  }

  async listIncidents() {
    this.assertOperator()
    const [incidents, payouts] = await Promise.all([
      this.gateway.readIncidents(),
      this.gateway.readPayouts(),
    ])
    const payoutByTableId = new Map(
      payouts.map((payout) => [payout.hosted_table_id, payout]),
    )
    return incidents.map((incident) =>
      mapOperatorIncident(
        incident,
        incident.hosted_table_id
          ? payoutByTableId.get(incident.hosted_table_id)
          : undefined,
      ),
    )
  }

  async listPayouts() {
    this.assertOperator()
    const [payouts, tables, incidents] = await Promise.all([
      this.gateway.readPayouts(),
      this.gateway.readHostedTables(),
      this.gateway.readIncidents(),
    ])
    const tableById = indexTables(tables)
    const tablesWithOpenIncidents = new Set(
      incidents
        .filter(
          (incident) =>
            incident.hosted_table_id &&
            openIncidentStatuses.has(incident.status),
        )
        .map((incident) => incident.hosted_table_id as string),
    )
    return payouts.map((payout) => {
      const table = tableById.get(payout.hosted_table_id)
      if (!table) {
        throw new RepositoryDataError(
          `payout_records.${payout.id}.hosted_table`,
        )
      }
      return mapOperatorPayout(
        payout,
        table,
        tablesWithOpenIncidents.has(payout.hosted_table_id),
      )
    })
  }

  async listAuditEvents() {
    this.assertOperator()
    const rows = await this.gateway.readAuditEvents()
    return rows.map(mapOperatorAudit)
  }

  private assertOperator() {
    assertHasAnyRole(this.actor, ['operator', 'administrator'])
  }
}

function indexTables(tables: readonly OperatorHostedTableRow[]) {
  return new Map(tables.map((table) => [table.id, table]))
}
