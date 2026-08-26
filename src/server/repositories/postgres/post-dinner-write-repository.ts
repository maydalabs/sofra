import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database } from '@/server/database/database.types'
import {
  PostDinnerWriteError,
  type PostDinnerWriteErrorCode,
  type PrivateFeedbackRecord,
  type PublicReviewRecord,
  type SafetyReportRecord,
  type SofraPostDinnerWriteRepository,
} from '../write-contracts'

type ReviewRow =
  Database['public']['Tables']['public_experience_reviews']['Row']
type FeedbackRow =
  Database['public']['Tables']['private_constructive_feedback']['Row']
type IncidentRow = Database['public']['Tables']['safety_incidents']['Row']

const errorCodesBySqlState: Record<string, PostDinnerWriteErrorCode> = {
  SF001: 'BOOKING_NOT_FOUND',
  SF008: 'BOOKING_NOT_OWNED',
  SF030: 'DINNER_NOT_COMPLETED',
  SF031: 'INVALID_INPUT',
  SF032: 'ALREADY_REVIEWED',
}

function toPostDinnerError(error: unknown): PostDinnerWriteError {
  const sqlState =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const code = errorCodesBySqlState[sqlState]
  if (!code) throw error
  return new PostDinnerWriteError(
    code,
    error instanceof Error ? error.message : String(error),
  )
}

export class PostgresSofraPostDinnerWriteRepository implements SofraPostDinnerWriteRepository {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async submitPublicReview(input: {
    bookingId: string
    rating: number
    title: string
    body: string
  }): Promise<PublicReviewRecord> {
    try {
      const rows = await this.sql<ReviewRow[]>`
        select * from public.submit_public_review(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.rating}::integer,
          ${input.title}::text,
          ${input.body}::text
        )
      `
      const row = rows[0]
      // The body is not echoed back: nothing downstream should be able to treat
      // an unmoderated review as publishable content.
      return {
        id: row.id,
        bookingId: row.booking_id,
        rating: row.rating,
        publishedAt: row.published_at,
      }
    } catch (error) {
      throw toPostDinnerError(error)
    }
  }

  async submitPrivateFeedback(input: {
    bookingId: string
    body: string
  }): Promise<PrivateFeedbackRecord> {
    try {
      const rows = await this.sql<FeedbackRow[]>`
        select * from public.submit_private_feedback(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.body}::text
        )
      `
      // Only the identifiers come back. Operations reads this through its own
      // restricted view, never through the traveller's own response.
      return { id: rows[0].id, bookingId: rows[0].booking_id }
    } catch (error) {
      throw toPostDinnerError(error)
    }
  }

  async reportSafetyIncident(input: {
    bookingId: string
    severity: string
    confidentialReport: string
  }): Promise<SafetyReportRecord> {
    try {
      const rows = await this.sql<IncidentRow[]>`
        select * from public.report_safety_incident(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.severity}::text,
          ${input.confidentialReport}::text
        )
      `
      const row = rows[0]
      const [held] = await this.sql<{ count: number }[]>`
        select count(*)::int as count from public.payout_records
        where hosted_table_id = ${row.hosted_table_id}::uuid and status = 'held'
      `
      // confidential_report is deliberately absent from the returned record.
      return {
        id: row.id,
        status: row.status,
        severity: row.severity,
        payoutsHeld: held.count,
      }
    } catch (error) {
      throw toPostDinnerError(error)
    }
  }
}
