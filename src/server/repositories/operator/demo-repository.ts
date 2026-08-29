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

  async listCompatibilityQueue() {
    this.assertOperator()
    // One fictional pending disclosure so the demo queue shows its shape.
    return [
      {
        bookingId: 'demo-compatibility-booking',
        tableLabel: 'Ev yemeği: mevsim sofrası · Kadıköy demo cluster',
        startsAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
        partySize: 2,
        disclosure:
          'One traveler has a severe tree-nut allergy and asks whether the household kitchen can avoid cross-contact.',
        disclosedAt: new Date().toISOString(),
      },
    ]
  }

  async listPendingReviews() {
    this.assertOperator()
    return [
      {
        id: 'demo-pending-review',
        tableLabel: 'Ev yemeği: mevsim sofrası · Kadıköy demo cluster',
        rating: 5,
        title: 'An unhurried, generous evening',
        body: 'A fictional pending review awaiting moderation in the demo walkthrough.',
        submittedAt: new Date().toISOString(),
      },
    ]
  }

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
