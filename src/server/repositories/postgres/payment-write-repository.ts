import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database } from '@/server/database/database.types'
import {
  PaymentWriteError,
  type BookingWriteRecord,
  type HostPayeeRecord,
  type PaymentWriteErrorCode,
  type RecordPaymentAuthorizedInput,
  type RecordPaymentFailedInput,
  type RecordPaymentRefundInput,
  type SofraPaymentWriteRepository,
} from '../write-contracts'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type HostPayeeRow = Database['public']['Tables']['host_payees']['Row']

const errorCodesBySqlState: Record<string, PaymentWriteErrorCode> = {
  SF001: 'BOOKING_NOT_FOUND',
  SF033: 'AMOUNT_MISMATCH',
  SF034: 'NOT_PAYABLE',
  SF035: 'REFUND_EXCEEDS_PAYMENT',
  SF036: 'NO_REFUNDABLE_PAYMENT',
  SF037: 'HOUSEHOLD_NOT_FOUND',
  SF020: 'NOT_OPERATOR',
}

function toPaymentWriteError(error: unknown): PaymentWriteError {
  const sqlState =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const code = errorCodesBySqlState[sqlState]
  if (!code) throw error
  return new PaymentWriteError(
    code,
    error instanceof Error ? error.message : String(error),
  )
}

function toBooking(row: BookingRow): BookingWriteRecord {
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

function toPayee(row: HostPayeeRow): HostPayeeRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    providerCode: row.provider_code,
    payeeReference: row.payee_reference,
  }
}

export class PostgresSofraPaymentWriteRepository implements SofraPaymentWriteRepository {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async recordPaymentAuthorized(
    input: RecordPaymentAuthorizedInput,
  ): Promise<BookingWriteRecord> {
    try {
      const rows = await this.sql<BookingRow[]>`
        select * from public.record_payment_authorized(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.providerCode}::text,
          ${input.providerReference}::text,
          ${input.providerPaymentId ?? null}::text,
          ${input.providerItemReference ?? null}::text,
          ${input.amountKurus}::integer,
          ${input.simulated ?? false}::boolean
        )
      `
      return toBooking(rows[0])
    } catch (error) {
      throw toPaymentWriteError(error)
    }
  }

  async recordPaymentFailed(
    input: RecordPaymentFailedInput,
  ): Promise<BookingWriteRecord> {
    try {
      const rows = await this.sql<BookingRow[]>`
        select * from public.record_payment_failed(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.providerCode}::text,
          ${input.providerReference}::text,
          ${input.simulated ?? false}::boolean
        )
      `
      return toBooking(rows[0])
    } catch (error) {
      throw toPaymentWriteError(error)
    }
  }

  async recordPaymentRefund(
    input: RecordPaymentRefundInput,
  ): Promise<BookingWriteRecord> {
    try {
      const rows = await this.sql<BookingRow[]>`
        select * from public.record_payment_refund(
          ${this.actorId}::uuid,
          ${input.bookingId}::uuid,
          ${input.amountKurus}::integer,
          ${input.reason}::text,
          ${input.providerReference ?? null}::text
        )
      `
      return toBooking(rows[0])
    } catch (error) {
      throw toPaymentWriteError(error)
    }
  }

  async registerHostPayee(input: {
    householdId: string
    providerCode: string
    payeeReference: string
  }): Promise<HostPayeeRecord> {
    try {
      const rows = await this.sql<HostPayeeRow[]>`
        select * from public.register_host_payee(
          ${this.actorId}::uuid,
          ${input.householdId}::uuid,
          ${input.providerCode}::text,
          ${input.payeeReference}::text
        )
      `
      return toPayee(rows[0])
    } catch (error) {
      throw toPaymentWriteError(error)
    }
  }

  async findHostPayee(
    householdId: string,
    providerCode: string,
  ): Promise<HostPayeeRecord | null> {
    const rows = await this.sql<HostPayeeRow[]>`
      select * from public.host_payees
      where household_id = ${householdId}::uuid
        and provider_code = ${providerCode}::text
      limit 1
    `
    return rows[0] ? toPayee(rows[0]) : null
  }
}
