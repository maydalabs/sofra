import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database } from '@/server/database/database.types'
import {
  BookingWriteError,
  type BookingWriteErrorCode,
  type BookingWriteRecord,
  type CreateBookingInput,
  type SofraWriteRepository,
} from '../write-contracts'

type BookingRow = Database['public']['Tables']['bookings']['Row']

/**
 * SQLSTATE codes raised by the booking functions. Mapping them here keeps the
 * domain vocabulary in TypeScript while the enforcement stays in the database,
 * where it also protects against writes that bypass this repository.
 */
const errorCodesBySqlState: Record<string, BookingWriteErrorCode> = {
  SF001: 'TABLE_NOT_FOUND',
  SF002: 'TABLE_NOT_BOOKABLE',
  SF003: 'BOOKING_CUTOFF_PASSED',
  SF004: 'INSUFFICIENT_SEATS',
  SF005: 'PARTY_SIZE_INVALID',
  SF006: 'PRICING_POLICY_MISSING',
  SF007: 'PRICING_INCONSISTENT',
  SF008: 'BOOKING_NOT_OWNED',
}

function toWriteError(error: unknown): BookingWriteError {
  const sqlState =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const message = error instanceof Error ? error.message : String(error)
  const code = errorCodesBySqlState[sqlState]
  if (!code) throw error
  // cancel_booking reuses SF002 for a booking that cannot leave its state.
  return new BookingWriteError(code, message)
}

function toRecord(row: BookingRow): BookingWriteRecord {
  return {
    id: row.id,
    tableId: row.hosted_table_id,
    partySize: row.party_size,
    status: row.status,
    compatibilityStatus: row.compatibility_status,
    paymentStatus: row.payment_status,
    guestTotalKurus: row.guest_total_kurus,
    hostNetPayoutKurus: row.host_net_payout_kurus,
    sofraGrossFeeKurus: row.sofra_gross_fee_kurus,
    refundDueKurus: row.refund_due_kurus,
    hostCompensationKurus: row.host_compensation_kurus,
    currency: 'TRY',
  }
}

export class PostgresSofraWriteRepository implements SofraWriteRepository {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async createBooking(input: CreateBookingInput): Promise<BookingWriteRecord> {
    try {
      const rows = await this.sql<BookingRow[]>`
        select * from public.create_booking(
          ${this.actorId}::uuid,
          ${input.tableId}::uuid,
          ${input.partySize}::integer,
          ${input.partyType}::text,
          ${this.sql.json(input.policySnapshot)}::jsonb,
          ${input.primaryGuestName}::text,
          ${input.primaryGuestEmail ?? null}::text,
          ${this.sql.array([...(input.additionalGuestNames ?? [])])}::text[],
          ${input.dietaryDisclosure ?? null}::text,
          ${input.referralAttributionId ?? null}::uuid
        )
      `
      return toRecord(rows[0])
    } catch (error) {
      throw toWriteError(error)
    }
  }

  async cancelBooking(
    bookingId: string,
    reason: string | null,
  ): Promise<BookingWriteRecord> {
    try {
      const rows = await this.sql<BookingRow[]>`
        select * from public.cancel_booking(
          ${this.actorId}::uuid,
          ${bookingId}::uuid,
          ${reason}::text
        )
      `
      return toRecord(rows[0])
    } catch (error) {
      const mapped = toWriteError(error)
      // The shared SQLSTATE codes mean something different on this path.
      if (mapped.code === 'TABLE_NOT_BOOKABLE') {
        throw new BookingWriteError('BOOKING_NOT_CANCELLABLE', mapped.message)
      }
      if (mapped.code === 'TABLE_NOT_FOUND') {
        throw new BookingWriteError('BOOKING_NOT_FOUND', mapped.message)
      }
      throw mapped
    }
  }
}
