import 'server-only'

import type {
  ApplicationStatus,
  BookingStatus,
  HostedTableStatus,
  IncidentStatus,
  PayoutStatus,
} from '@/server/database/database.types'

export interface OperatorHostApplicationRecord {
  id: string
  applicantName: string
  householdName: string | null
  householdStructure: string | null
  status: ApplicationStatus
  motivation: string
  hostingPlan: string
  submittedAt: string | null
}

export interface OperatorTableRecord {
  id: string
  householdName: string
  startsAt: string
  neighborhood: string
  status: HostedTableStatus
  menuTitle: string
  menuDescription: string
  proposedCapacity: number
  certifiedCapacity: number
  hostNetPayoutKurus: number
  guestPriceKurus: number
  expectedHouseholdParticipants: string
  accessibilityInformation: string
}

export interface OperatorBookingRecord {
  id: string
  tableId: string
  menuTitle: string
  partySize: number
  guestTotalKurus: number
  status: BookingStatus
}

export interface OperatorIncidentRecord {
  id: string
  bookingId: string | null
  tableId: string | null
  status: IncidentStatus
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidentialReport: string
  relatedPayoutId: string | null
  payoutHeld: boolean
  createdAt: string
}

export interface OperatorPayoutRecord {
  id: string
  tableId: string
  tableLabel: string
  hostPayoutKurus: number
  status: PayoutStatus
  incidentStatus: 'none' | 'open'
  holdReason: string | null
}

export interface OperatorAuditRecord {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  reason: string | null
  occurredAt: string
}

export interface SofraOperatorReadRepository {
  listHostApplications(): Promise<OperatorHostApplicationRecord[]>
  findHostApplicationById(
    id: string,
  ): Promise<OperatorHostApplicationRecord | undefined>
  listTableReviews(): Promise<OperatorTableRecord[]>
  findTableReviewById(id: string): Promise<OperatorTableRecord | undefined>
  listBookings(): Promise<OperatorBookingRecord[]>
  listIncidents(): Promise<OperatorIncidentRecord[]>
  listPayouts(): Promise<OperatorPayoutRecord[]>
  listAuditEvents(): Promise<OperatorAuditRecord[]>
}
