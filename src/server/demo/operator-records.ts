import 'server-only'

import { getDemoBookings } from '@/features/bookings/demo-bookings'
import { getPrivateDemoTables } from '@/features/hosted-tables/demo-tables'
import type {
  OperatorAuditRecord,
  OperatorBookingRecord,
  OperatorHostApplicationRecord,
  OperatorIncidentRecord,
  OperatorPayoutRecord,
  OperatorTableRecord,
} from '@/server/repositories/operator/contracts'

const application: OperatorHostApplicationRecord = {
  id: 'demo-application',
  applicantName: 'Selin',
  householdName: 'Selin & Derya household',
  householdStructure: 'A parent and adult child',
  status: 'submitted',
  motivation:
    'We already host long Sunday dinners and would like to welcome careful, curious visitors into that rhythm.',
  hostingPlan:
    'A parent and adult child would host together in the Üsküdar demo cluster.',
  submittedAt: '2026-08-22T18:00:00.000Z',
}

const incidents: readonly OperatorIncidentRecord[] = [
  {
    id: 'demo-incident-open',
    bookingId: 'booking-demo-completed',
    tableId: 'table-cem-completed',
    status: 'open',
    severity: 'medium',
    confidentialReport:
      'Fictional confidential incident used only to verify access and payout holds.',
    relatedPayoutId: 'demo-payout-held',
    payoutHeld: true,
    createdAt: '2026-08-23T12:00:00.000Z',
  },
]

const payouts: readonly OperatorPayoutRecord[] = [
  {
    id: 'demo-payout-held',
    tableId: 'table-cem-completed',
    tableLabel: 'A spring table with old records',
    hostPayoutKurus: 480_000,
    status: 'held',
    incidentStatus: 'open',
    holdReason: 'Related operator-only safety review remains open',
  },
  {
    id: 'demo-payout-eligible',
    tableId: 'table-ozdemir-sisli',
    tableLabel: 'Three generations, one table',
    hostPayoutKurus: 520_000,
    status: 'eligible',
    incidentStatus: 'none',
    holdReason: null,
  },
]

const auditEvents: readonly OperatorAuditRecord[] = [
  {
    id: 'demo-audit-table-submitted',
    action: 'hosted_table.submitted',
    entityType: 'hosted_table',
    entityId: 'table-ece-can-besiktas',
    actorId: 'demo-host',
    reason: 'Host submitted complete table',
    occurredAt: '2026-08-22T15:00:00.000Z',
  },
  {
    id: 'demo-audit-application-submitted',
    action: 'host_application.submitted',
    entityType: 'host_application',
    entityId: 'demo-application',
    actorId: 'demo-applicant',
    reason: 'Verified email application',
    occurredAt: '2026-08-22T18:00:00.000Z',
  },
  {
    id: 'demo-audit-payout-held',
    action: 'payout.held',
    entityType: 'payout_record',
    entityId: 'demo-payout-held',
    actorId: 'demo-operator',
    reason: 'Related safety incident open',
    occurredAt: '2026-08-23T13:00:00.000Z',
  },
]

function toOperatorTableRecord(
  table: ReturnType<typeof getPrivateDemoTables>[number],
): OperatorTableRecord {
  return {
    id: table.id,
    householdName: table.householdName,
    startsAt: table.startsAt,
    neighborhood: table.neighborhood,
    status: table.status,
    menuTitle: table.menuTitle,
    menuDescription: table.menuDescription,
    proposedCapacity: table.proposedCapacity,
    certifiedCapacity: table.certifiedCapacity,
    hostNetPayoutKurus: table.hostNetPayoutKurus,
    guestPriceKurus: table.guestPriceKurus,
    expectedHouseholdParticipants: table.expectedHouseholdParticipants,
    accessibilityInformation: table.accessibilityInformation,
  }
}

export function getDemoOperatorHostApplications() {
  return [application]
}

export function getDemoOperatorTables() {
  return getPrivateDemoTables().map(toOperatorTableRecord)
}

export function getDemoOperatorBookings(): OperatorBookingRecord[] {
  return getDemoBookings().map((booking) => ({
    id: booking.id,
    tableId: booking.tableId,
    menuTitle: booking.menuTitle,
    partySize: booking.partySize,
    guestTotalKurus: booking.guestTotalKurus,
    status: booking.status,
  }))
}

export function getDemoOperatorIncidents() {
  return [...incidents]
}

export function getDemoOperatorPayouts() {
  return [...payouts]
}

export function getDemoOperatorAuditEvents() {
  return [...auditEvents]
}
