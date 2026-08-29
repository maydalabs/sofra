import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database, IncidentStatus } from '@/server/database/database.types'
import {
  OperatorWriteError,
  type CompatibilityDecisionRecord,
  type TableCancellationRecord,
  type DecideHostApplicationInput,
  type OperatorApplicationRecord,
  type OperatorIncidentWriteRecord,
  type OperatorPayoutWriteRecord,
  type OperatorTableWriteRecord,
  type OperatorWriteErrorCode,
  type ReviewHostedTableInput,
  type ReviewModerationRecord,
  type SofraOperatorWriteRepository,
} from '../write-contracts'

type ApplicationRow = Database['public']['Tables']['host_applications']['Row']
type HostedTableRow = Database['public']['Tables']['hosted_tables']['Row']
type PayoutRow = Database['public']['Tables']['payout_records']['Row']
type IncidentRow = Database['public']['Tables']['safety_incidents']['Row']
type ReviewRow =
  Database['public']['Tables']['public_experience_reviews']['Row']

const errorCodesBySqlState: Record<string, OperatorWriteErrorCode> = {
  SF001: 'NOT_FOUND',
  SF003: 'BOOKING_CUTOFF_PASSED',
  SF012: 'NO_ACTIVE_CERTIFICATION',
  SF017: 'APPLICATION_HAS_NO_HOUSEHOLD',
  SF020: 'NOT_AUTHORIZED',
  SF021: 'APPLICATION_NOT_DECIDABLE',
  SF022: 'TABLE_NOT_REVIEWABLE',
  SF023: 'PAYOUT_NOT_FOUND',
  SF024: 'INCIDENT_NOT_FOUND',
  SF025: 'INVALID_TRANSITION',
  SF026: 'OPEN_INCIDENT_BLOCKS_PAYOUT',
  SF027: 'TABLE_NOT_CANCELLABLE',
}

function toOperatorError(error: unknown): OperatorWriteError {
  const sqlState =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const code = errorCodesBySqlState[sqlState]
  if (!code) throw error
  return new OperatorWriteError(
    code,
    error instanceof Error ? error.message : String(error),
  )
}

/**
 * Operator mutations act on records belonging to other people, so the role is
 * checked twice: once by the repository factory before this class is built, and
 * again inside every SQL function.
 */
export class PostgresSofraOperatorWriteRepository implements SofraOperatorWriteRepository {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async cancelPublishedTable(
    tableId: string,
    reason: string,
  ): Promise<TableCancellationRecord> {
    try {
      const rows = await this.sql<
        {
          table_id: string
          bookings_cancelled: number
          refund_due_total_kurus: string
          payouts_held: number
        }[]
      >`
        select * from public.cancel_published_table(
          ${this.actorId}::uuid,
          ${tableId}::uuid,
          ${reason}::text
        )
      `
      const row = rows[0]
      return {
        tableId: row.table_id,
        bookingsCancelled: row.bookings_cancelled,
        // bigint arrives as a string to avoid precision loss; refund totals
        // stay well inside the safe-integer range.
        refundDueTotalKurus: Number(row.refund_due_total_kurus),
        payoutsHeld: row.payouts_held,
      }
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async decideDietaryCompatibility(
    bookingId: string,
    decision: 'accepted' | 'declined',
    privateReason?: string | null,
  ): Promise<CompatibilityDecisionRecord> {
    try {
      const rows = await this.sql<
        Database['public']['Tables']['bookings']['Row'][]
      >`
        select * from public.decide_dietary_compatibility(
          ${this.actorId}::uuid,
          ${bookingId}::uuid,
          ${decision}::text,
          ${privateReason ?? null}::text
        )
      `
      return {
        bookingId: rows[0].id,
        compatibilityStatus: rows[0].compatibility_status,
      }
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async moderatePublicReview(
    reviewId: string,
    decision: 'publish' | 'reject',
    reason?: string | null,
  ): Promise<ReviewModerationRecord> {
    try {
      const rows = await this.sql<ReviewRow[]>`
        select * from public.moderate_public_review(
          ${this.actorId}::uuid,
          ${reviewId}::uuid,
          ${decision}::text,
          ${reason ?? null}::text
        )
      `
      // The review body is not returned: moderating it does not make it this
      // caller's content to pass around.
      return {
        id: rows[0].id,
        publishedAt: rows[0].published_at,
        rejectedAt: rows[0].rejected_at,
      }
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async decideHostApplication(
    input: DecideHostApplicationInput,
  ): Promise<OperatorApplicationRecord> {
    try {
      const rows = await this.sql<ApplicationRow[]>`
        select * from public.decide_host_application(
          ${this.actorId}::uuid,
          ${input.applicationId}::uuid,
          ${input.decision}::text,
          ${input.reason ?? null}::text,
          ${input.certifiedCapacity ?? null}::integer
        )
      `
      const row = rows[0]
      return {
        id: row.id,
        status: row.status,
        householdId: row.household_id,
        decidedAt: row.decided_at,
      }
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async reviewHostedTable(
    input: ReviewHostedTableInput,
  ): Promise<OperatorTableWriteRecord> {
    try {
      const rows = await this.sql<HostedTableRow[]>`
        select * from public.review_hosted_table(
          ${this.actorId}::uuid,
          ${input.tableId}::uuid,
          ${input.decision}::text,
          ${input.reason ?? null}::text
        )
      `
      return toTable(rows[0])
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async publishHostedTable(tableId: string): Promise<OperatorTableWriteRecord> {
    try {
      const rows = await this.sql<HostedTableRow[]>`
        select * from public.publish_hosted_table(
          ${this.actorId}::uuid, ${tableId}::uuid
        )
      `
      return toTable(rows[0])
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async triageIncident(
    incidentId: string,
    status: IncidentStatus,
    reason?: string | null,
  ): Promise<OperatorIncidentWriteRecord> {
    try {
      const rows = await this.sql<IncidentRow[]>`
        select * from public.triage_incident(
          ${this.actorId}::uuid,
          ${incidentId}::uuid,
          ${status}::public.incident_status,
          ${reason ?? null}::text
        )
      `
      // The confidential report is deliberately not returned.
      return {
        id: rows[0].id,
        status: rows[0].status,
        severity: rows[0].severity,
      }
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async holdPayout(
    payoutId: string,
    holdReason: string,
  ): Promise<OperatorPayoutWriteRecord> {
    try {
      const rows = await this.sql<PayoutRow[]>`
        select * from public.hold_payout(
          ${this.actorId}::uuid, ${payoutId}::uuid, ${holdReason}::text
        )
      `
      return toPayout(rows[0])
    } catch (error) {
      throw toOperatorError(error)
    }
  }

  async releasePayout(
    payoutId: string,
    reason?: string | null,
  ): Promise<OperatorPayoutWriteRecord> {
    try {
      const rows = await this.sql<PayoutRow[]>`
        select * from public.release_payout(
          ${this.actorId}::uuid, ${payoutId}::uuid, ${reason ?? null}::text
        )
      `
      return toPayout(rows[0])
    } catch (error) {
      throw toOperatorError(error)
    }
  }
}

function toTable(row: HostedTableRow): OperatorTableWriteRecord {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    publishedAt: row.published_at,
  }
}

function toPayout(row: PayoutRow): OperatorPayoutWriteRecord {
  return {
    id: row.id,
    status: row.status,
    amountKurus: row.amount_kurus,
    holdReason: row.hold_reason,
    releasedAt: row.released_at,
  }
}
