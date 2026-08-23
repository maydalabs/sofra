import { describe, expect, it, vi } from 'vitest'

import type { Actor } from '@/server/authorization/roles'
import { AuthorizationError } from '@/server/authorization/roles'
import { RepositoryDataError } from '@/server/repositories/errors'

import type {
  OperatorAuditRow,
  OperatorBookingRow,
  OperatorHostApplicationRow,
  OperatorHostedTableRow,
  OperatorHouseholdRow,
  OperatorIncidentRow,
  OperatorPayoutRow,
  OperatorProfileRow,
  SofraOperatorReadGateway,
} from './gateway'
import { SupabaseSofraOperatorReadRepository } from './repository'

const actor: Actor = {
  id: 'operator-1',
  email: 'operator@sofra.example',
  emailVerified: true,
  roles: ['operator'],
  source: 'supabase',
}

const profile: OperatorProfileRow = {
  id: 'applicant-1',
  display_name: 'Selin',
}

const household: OperatorHouseholdRow = {
  id: 'household-1',
  public_name: 'Selin household',
  household_structure: 'Two adult hosts',
}

const application: OperatorHostApplicationRow = {
  id: 'application-1',
  applicant_profile_id: profile.id,
  household_id: household.id,
  status: 'submitted',
  motivation: 'We already welcome guests for long dinners.',
  hosting_plan: 'Both adults will host dinner and tea.',
  submitted_at: '2026-08-22T18:00:00.000Z',
}

const table: OperatorHostedTableRow = {
  id: 'table-1',
  household_id: household.id,
  starts_at: '2026-09-20T16:00:00.000Z',
  public_neighborhood: 'Kadıköy demo cluster',
  status: 'submitted',
  menu_title: 'A Sunday table',
  menu_description: 'Soup, a complete main course, dessert, and tea.',
  proposed_capacity: 4,
  certified_capacity: 4,
  host_net_payout_kurus: 120_000,
  guest_price_kurus: 160_000,
  expected_household_participants: 'Two verified adult hosts.',
  accessibility_information: 'Lift access.',
}

const booking: OperatorBookingRow = {
  id: 'booking-1',
  hosted_table_id: table.id,
  party_size: 2,
  guest_total_kurus: 320_000,
  status: 'completed',
}

const incident: OperatorIncidentRow = {
  id: 'incident-1',
  booking_id: booking.id,
  hosted_table_id: table.id,
  status: 'open',
  severity: 'medium',
  confidential_report: 'Fictional restricted report.',
  created_at: '2026-08-23T12:00:00.000Z',
}

const payout: OperatorPayoutRow = {
  id: 'payout-1',
  hosted_table_id: table.id,
  amount_kurus: 240_000,
  status: 'held',
  hold_reason: 'Related incident is open',
}

const audit: OperatorAuditRow = {
  id: 'audit-1',
  action: 'payout.held',
  entity_type: 'payout_record',
  entity_id: payout.id,
  actor_profile_id: actor.id,
  reason: 'Related incident is open',
  occurred_at: '2026-08-23T13:00:00.000Z',
}

function createGateway(
  overrides: Partial<SofraOperatorReadGateway> = {},
): SofraOperatorReadGateway {
  return {
    readProfiles: async () => [profile],
    readHouseholds: async () => [household],
    readHostApplications: async () => [application],
    readHostedTables: async () => [table],
    readBookings: async () => [booking],
    readIncidents: async () => [incident],
    readPayouts: async () => [payout],
    readAuditEvents: async () => [audit],
    ...overrides,
  }
}

describe('SupabaseSofraOperatorReadRepository', () => {
  it('maps each privileged read through an explicit operator record', async () => {
    const repository = new SupabaseSofraOperatorReadRepository(
      createGateway(),
      actor,
    )

    await expect(repository.listHostApplications()).resolves.toMatchObject([
      { id: application.id, applicantName: 'Selin' },
    ])
    await expect(repository.listTableReviews()).resolves.toMatchObject([
      { id: table.id, householdName: household.public_name },
    ])
    await expect(repository.listBookings()).resolves.toMatchObject([
      { id: booking.id, menuTitle: table.menu_title },
    ])
    await expect(repository.listIncidents()).resolves.toMatchObject([
      { id: incident.id, relatedPayoutId: payout.id, payoutHeld: true },
    ])
    await expect(repository.listPayouts()).resolves.toMatchObject([
      { id: payout.id, incidentStatus: 'open' },
    ])
    await expect(repository.listAuditEvents()).resolves.toMatchObject([
      { id: audit.id, actorId: actor.id },
    ])
  })

  it('fails closed when a joined applicant profile is missing', async () => {
    const repository = new SupabaseSofraOperatorReadRepository(
      createGateway({ readProfiles: async () => [] }),
      actor,
    )

    await expect(repository.listHostApplications()).rejects.toBeInstanceOf(
      RepositoryDataError,
    )
  })

  it('rejects non-operators before querying the gateway', async () => {
    const readHostApplications = vi.fn(async () => [application])
    const repository = new SupabaseSofraOperatorReadRepository(
      createGateway({ readHostApplications }),
      { ...actor, roles: ['traveler'] },
    )

    await expect(repository.listHostApplications()).rejects.toBeInstanceOf(
      AuthorizationError,
    )
    expect(readHostApplications).not.toHaveBeenCalled()
  })

  it('keeps table and booking projections free of unrelated sensitive fields', async () => {
    const repository = new SupabaseSofraOperatorReadRepository(
      createGateway(),
      actor,
    )
    const serialized = JSON.stringify({
      tables: await repository.listTableReviews(),
      bookings: await repository.listBookings(),
    })

    expect(serialized).not.toMatch(
      /private_address|precise|arrival|dietary|guest_name/i,
    )
  })
})
