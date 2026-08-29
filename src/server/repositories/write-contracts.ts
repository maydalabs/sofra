import type {
  ApplicationStatus,
  BookingStatus,
  CompatibilityStatus,
  HostedTableStatus,
  IncidentStatus,
  PaymentStatus,
  PayoutStatus,
} from '@/server/database/database.types'

/** JSON-safe values only: the snapshot is stored verbatim as jsonb. */
export type PolicySnapshot = Record<string, string | number | boolean | null>

export interface CreateBookingInput {
  tableId: string
  partySize: number
  partyType: string
  policySnapshot: PolicySnapshot
  primaryGuestName: string
  primaryGuestEmail?: string | null
  additionalGuestNames?: readonly string[]
  /** Free text; classified by the reviewer, never at insert time. */
  dietaryDisclosure?: string | null
  referralAttributionId?: string | null
}

/**
 * What a durable booking write returns. Money is echoed back as the database
 * computed it, never as the caller proposed it, so the interface makes it
 * impossible to display a total the server did not calculate.
 */
export interface BookingWriteRecord {
  id: string
  tableId: string
  partySize: number
  status: BookingStatus
  compatibilityStatus: CompatibilityStatus
  paymentStatus: PaymentStatus
  guestTotalKurus: number
  hostNetPayoutKurus: number
  sofraGrossFeeKurus: number
  /** What the traveller is owed back; zero until money was collected. */
  refundDueKurus: number
  /** The host's share of the retained portion on a partial refund. */
  hostCompensationKurus: number
  currency: 'TRY'
}

export type BookingWriteErrorCode =
  | 'TABLE_NOT_FOUND'
  | 'TABLE_NOT_BOOKABLE'
  | 'BOOKING_CUTOFF_PASSED'
  | 'INSUFFICIENT_SEATS'
  | 'PARTY_SIZE_INVALID'
  | 'PRICING_POLICY_MISSING'
  | 'PRICING_INCONSISTENT'
  | 'BOOKING_NOT_OWNED'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_NOT_CANCELLABLE'

export class BookingWriteError extends Error {
  constructor(
    readonly code: BookingWriteErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BookingWriteError'
  }
}

/**
 * Durable mutations. Kept separate from SofraReadRepository so that a component
 * holding a read repository cannot mutate, and so demo mode can refuse writes
 * without having to stub out reads.
 */
export interface SofraWriteRepository {
  createBooking(input: CreateBookingInput): Promise<BookingWriteRecord>
  cancelBooking(
    bookingId: string,
    reason: string | null,
  ): Promise<BookingWriteRecord>
}

// ---------------------------------------------------------------------------
// Host lifecycle
// ---------------------------------------------------------------------------

export interface SubmitHostApplicationInput {
  householdName: string
  neighborhood: string
  story: string
  motivation: string
  participation: string
}

export interface HostApplicationRecord {
  id: string
  householdId: string | null
  status: ApplicationStatus
  submittedAt: string | null
}

export interface CreateHostedTableDraftInput {
  menuTitle: string
  menuDescription: string
  startsAt: string
  format: 'shared' | 'private'
  proposedCapacity: number
  minimumGuestCount: number
  hostNetPayoutKurus: number
  atmosphere: string
  expectedHouseholdParticipants: string
  practicalInformation: string
  accessibilityInformation?: string
}

export interface HostedTableWriteRecord {
  id: string
  slug: string
  status: HostedTableStatus
  startsAt: string
  proposedCapacity: number
  hostNetPayoutKurus: number
  guestPriceKurus: number
}

export type HostWriteErrorCode =
  | 'PROFILE_NOT_FOUND'
  | 'APPLICATION_IN_PROGRESS'
  | 'NO_HOUSEHOLD'
  | 'NO_CERTIFIED_HOUSEHOLD'
  | 'NO_ACTIVE_CERTIFICATION'
  | 'NO_VERIFIED_ADDRESS'
  | 'NO_PRICING_POLICY'
  | 'CAPACITY_EXCEEDS_CERTIFICATION'
  | 'SCHEDULE_OUT_OF_WINDOW'
  | 'ACTIVE_TABLE_LIMIT_REACHED'
  | 'TABLE_NOT_FOUND'
  | 'TABLE_NOT_EDITABLE'
  | 'ADDRESS_INCOMPLETE'

export class HostWriteError extends Error {
  constructor(
    readonly code: HostWriteErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'HostWriteError'
  }
}

export type DwellingType = 'apartment_flat' | 'detached_house' | 'other'

export interface HostAddressInput {
  addressLine1: string
  addressLine2?: string | null
  district: string
  city: string
  postalCode?: string | null
  arrivalInstructions?: string | null
  /** Coarse building type; drives launch geography per docs/MARKET_EVIDENCE.md. */
  dwellingType?: DwellingType | null
}

export interface HostAddressRecord {
  id: string
  district: string
  city: string
  dwellingType: DwellingType | null
  /** Cleared on every edit: an unseen address is unverified by definition. */
  verifiedAt: string | null
}

export interface SofraHostWriteRepository {
  submitHostAddress(input: HostAddressInput): Promise<HostAddressRecord>
  submitHostApplication(
    input: SubmitHostApplicationInput,
  ): Promise<HostApplicationRecord>
  createHostedTableDraft(
    input: CreateHostedTableDraftInput,
  ): Promise<HostedTableWriteRecord>
  submitHostedTable(tableId: string): Promise<HostedTableWriteRecord>
}

// ---------------------------------------------------------------------------
// Operator
// ---------------------------------------------------------------------------

export type OperatorDecision = 'approve' | 'changes_requested' | 'decline'

export interface DecideHostApplicationInput {
  applicationId: string
  decision: OperatorDecision
  reason?: string | null
  /** Required when approving; the rubric behind it is still an open decision. */
  certifiedCapacity?: number | null
}

export interface ReviewHostedTableInput {
  tableId: string
  decision: OperatorDecision
  reason?: string | null
}

export interface OperatorApplicationRecord {
  id: string
  status: ApplicationStatus
  householdId: string | null
  decidedAt: string | null
}

export interface OperatorTableWriteRecord {
  id: string
  slug: string
  status: HostedTableStatus
  publishedAt: string | null
}

export interface OperatorPayoutWriteRecord {
  id: string
  status: PayoutStatus
  amountKurus: number
  holdReason: string | null
  releasedAt: string | null
}

export interface OperatorIncidentWriteRecord {
  id: string
  status: IncidentStatus
  severity: string
}

export type OperatorWriteErrorCode =
  | 'NOT_AUTHORIZED'
  | 'APPLICATION_NOT_DECIDABLE'
  | 'APPLICATION_HAS_NO_HOUSEHOLD'
  | 'TABLE_NOT_REVIEWABLE'
  | 'PAYOUT_NOT_FOUND'
  | 'INCIDENT_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'OPEN_INCIDENT_BLOCKS_PAYOUT'
  | 'NO_ACTIVE_CERTIFICATION'
  | 'BOOKING_CUTOFF_PASSED'
  | 'NOT_FOUND'
  | 'TABLE_NOT_CANCELLABLE'

export class OperatorWriteError extends Error {
  constructor(
    readonly code: OperatorWriteErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'OperatorWriteError'
  }
}

export interface CompatibilityDecisionRecord {
  bookingId: string
  compatibilityStatus: CompatibilityStatus
}

export interface ReviewModerationRecord {
  id: string
  publishedAt: string | null
  rejectedAt: string | null
}

export interface TableCancellationRecord {
  tableId: string
  bookingsCancelled: number
  refundDueTotalKurus: number
  payoutsHeld: number
}

export interface SofraOperatorWriteRepository {
  /** Platform cancellation: every open booking is refunded 100%, always. */
  cancelPublishedTable(
    tableId: string,
    reason: string,
  ): Promise<TableCancellationRecord>
  decideDietaryCompatibility(
    bookingId: string,
    decision: 'accepted' | 'declined',
    privateReason?: string | null,
  ): Promise<CompatibilityDecisionRecord>
  moderatePublicReview(
    reviewId: string,
    decision: 'publish' | 'reject',
    reason?: string | null,
  ): Promise<ReviewModerationRecord>
  decideHostApplication(
    input: DecideHostApplicationInput,
  ): Promise<OperatorApplicationRecord>
  reviewHostedTable(
    input: ReviewHostedTableInput,
  ): Promise<OperatorTableWriteRecord>
  publishHostedTable(tableId: string): Promise<OperatorTableWriteRecord>
  triageIncident(
    incidentId: string,
    status: IncidentStatus,
    reason?: string | null,
  ): Promise<OperatorIncidentWriteRecord>
  holdPayout(
    payoutId: string,
    holdReason: string,
  ): Promise<OperatorPayoutWriteRecord>
  releasePayout(
    payoutId: string,
    reason?: string | null,
  ): Promise<OperatorPayoutWriteRecord>
}

// ---------------------------------------------------------------------------
// Post-dinner channels
// ---------------------------------------------------------------------------

export interface PublicReviewRecord {
  id: string
  bookingId: string
  rating: number | null
  /** Null until a moderator publishes it. */
  publishedAt: string | null
}

export interface PrivateFeedbackRecord {
  id: string
  bookingId: string
}

export interface SafetyReportRecord {
  id: string
  status: IncidentStatus
  severity: string
  /** How many payouts for this dinner were held as a result. */
  payoutsHeld: number
}

export type PostDinnerWriteErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_NOT_OWNED'
  | 'DINNER_NOT_COMPLETED'
  | 'INVALID_INPUT'
  | 'ALREADY_REVIEWED'

export class PostDinnerWriteError extends Error {
  constructor(
    readonly code: PostDinnerWriteErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PostDinnerWriteError'
  }
}

/**
 * Three separate methods rather than one with a visibility argument: the
 * destinations have genuinely different privacy rules, and a shared entry point
 * would make it possible to publish something meant to stay private by passing
 * the wrong flag.
 */
export interface SofraPostDinnerWriteRepository {
  submitPublicReview(input: {
    bookingId: string
    rating: number
    title: string
    body: string
  }): Promise<PublicReviewRecord>
  submitPrivateFeedback(input: {
    bookingId: string
    body: string
  }): Promise<PrivateFeedbackRecord>
  reportSafetyIncident(input: {
    bookingId: string
    severity: string
    confidentialReport: string
  }): Promise<SafetyReportRecord>
}
