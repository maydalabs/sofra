import 'server-only'

import type {
  OperatorAuditRecord,
  OperatorBookingRecord,
  OperatorHostApplicationRecord,
  OperatorIncidentRecord,
  OperatorPayoutRecord,
  OperatorTableRecord,
} from '@/server/repositories/operator/contracts'

import type {
  OperatorAuditRow,
  OperatorBookingRow,
  OperatorHostApplicationRow,
  OperatorHostedTableRow,
  OperatorHouseholdRow,
  OperatorIncidentRow,
  OperatorPayoutRow,
  OperatorProfileRow,
} from './gateway'

export function mapOperatorHostApplication(
  row: OperatorHostApplicationRow,
  applicant: OperatorProfileRow,
  household: OperatorHouseholdRow | undefined,
): OperatorHostApplicationRecord {
  return {
    id: row.id,
    applicantName: applicant.display_name,
    householdName: household?.public_name ?? null,
    householdStructure: household?.household_structure ?? null,
    status: row.status,
    motivation: row.motivation,
    hostingPlan: row.hosting_plan,
    submittedAt: row.submitted_at,
  }
}

export function mapOperatorTable(
  row: OperatorHostedTableRow,
  household: OperatorHouseholdRow,
): OperatorTableRecord {
  return {
    id: row.id,
    householdName: household.public_name,
    startsAt: row.starts_at,
    neighborhood: row.public_neighborhood,
    status: row.status,
    menuTitle: row.menu_title,
    menuDescription: row.menu_description,
    proposedCapacity: row.proposed_capacity,
    certifiedCapacity: row.certified_capacity,
    hostNetPayoutKurus: row.host_net_payout_kurus,
    guestPriceKurus: row.guest_price_kurus,
    expectedHouseholdParticipants: row.expected_household_participants,
    accessibilityInformation: row.accessibility_information,
  }
}

export function mapOperatorBooking(
  row: OperatorBookingRow,
  table: OperatorHostedTableRow,
): OperatorBookingRecord {
  return {
    id: row.id,
    tableId: row.hosted_table_id,
    menuTitle: table.menu_title,
    partySize: row.party_size,
    guestTotalKurus: row.guest_total_kurus,
    status: row.status,
  }
}

export function mapOperatorIncident(
  row: OperatorIncidentRow,
  relatedPayout: OperatorPayoutRow | undefined,
): OperatorIncidentRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    tableId: row.hosted_table_id,
    status: row.status,
    severity: row.severity,
    confidentialReport: row.confidential_report,
    relatedPayoutId: relatedPayout?.id ?? null,
    payoutHeld: relatedPayout?.status === 'held',
    createdAt: row.created_at,
  }
}

export function mapOperatorPayout(
  row: OperatorPayoutRow,
  table: OperatorHostedTableRow,
  hasOpenIncident: boolean,
): OperatorPayoutRecord {
  return {
    id: row.id,
    tableId: row.hosted_table_id,
    tableLabel: table.menu_title,
    hostPayoutKurus: row.amount_kurus,
    status: row.status,
    incidentStatus: hasOpenIncident ? 'open' : 'none',
    holdReason: row.hold_reason,
  }
}

export function mapOperatorAudit(row: OperatorAuditRow): OperatorAuditRecord {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_profile_id,
    reason: row.reason,
    occurredAt: row.occurred_at,
  }
}
