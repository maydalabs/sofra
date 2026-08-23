import 'server-only'

import {
  getDemoOperatorAuditEvents,
  getDemoOperatorBookings,
  getDemoOperatorHostApplications,
  getDemoOperatorIncidents,
  getDemoOperatorPayouts,
  getDemoOperatorTables,
} from '@/server/demo/operator-records'
import { assertHasAnyRole } from '@/server/authorization/roles'
import type { Actor } from '@/server/authorization/roles'

import type { SofraOperatorReadRepository } from './contracts'

export class DemoSofraOperatorReadRepository implements SofraOperatorReadRepository {
  constructor(private readonly actor: Actor) {}

  async listHostApplications() {
    this.assertOperator()
    return getDemoOperatorHostApplications()
  }

  async findHostApplicationById(id: string) {
    const applications = await this.listHostApplications()
    return applications.find((application) => application.id === id)
  }

  async listTableReviews() {
    this.assertOperator()
    return getDemoOperatorTables()
  }

  async findTableReviewById(id: string) {
    const tables = await this.listTableReviews()
    return tables.find((table) => table.id === id)
  }

  async listBookings() {
    this.assertOperator()
    return getDemoOperatorBookings()
  }

  async listIncidents() {
    this.assertOperator()
    return getDemoOperatorIncidents()
  }

  async listPayouts() {
    this.assertOperator()
    return getDemoOperatorPayouts()
  }

  async listAuditEvents() {
    this.assertOperator()
    return getDemoOperatorAuditEvents()
  }

  private assertOperator() {
    assertHasAnyRole(this.actor, ['operator', 'administrator'])
  }
}
