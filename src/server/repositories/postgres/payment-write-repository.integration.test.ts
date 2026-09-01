import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresSofraPaymentWriteRepository } from './payment-write-repository'
import { PostgresSofraWriteRepository } from './write-repository'

/**
 * The payment ledger against a real database: amount enforcement, the
 * booking-status transition that payment settles, refund accumulation, and
 * payee registration — all of it enforced by the SQL functions themselves.
 */
const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

const TRAVELLER = '10000000-0000-4000-8000-000000000008' // Demo Traveler
const OPERATOR = '10000000-0000-4000-8000-000000000009' // Demo Operator
const POLICY = { takeRateBasisPoints: 2500, capturedAt: '2026-08-26T00:00:00Z' }

/** Fresh table per test; paytest- slugs keep cleanup scoped to this file. */
async function createTable(seats: number, minimum = 2) {
  const [row] = await sql<{ id: string }[]>`
    insert into public.hosted_tables (
      slug, household_id, lead_verified_host_id, private_address_id,
      pricing_policy_id, starts_at, public_neighborhood, format, menu_title,
      menu_description, atmosphere, expected_household_participants,
      practical_information, accessibility_information, proposed_capacity,
      certified_capacity, available_seats, minimum_guest_count,
      host_net_payout_kurus, guest_price_kurus, booking_cutoff_at,
      roster_lock_at, status, published_at
    )
    select
      ${'paytest-' + crypto.randomUUID()},
      h.id, h.owner_profile_id, a.id,
      '20000000-0000-4000-8000-000000000001',
      now() + interval '10 days', 'Kadıköy', 'shared', 'Test menu',
      'd', 'warm', 'Household', 'i', 'i',
      ${seats}, ${seats}, ${seats}, ${minimum},
      45000, 60000,
      now() + interval '8 days', now() + interval '9 days',
      'published', now()
    from public.households h
    join public.household_private_addresses a on a.household_id = h.id
    limit 1
    returning id
  `
  return row.id
}

const bookings = new PostgresSofraWriteRepository(sql, TRAVELLER)
const ledger = new PostgresSofraPaymentWriteRepository(sql, TRAVELLER)
const operatorLedger = new PostgresSofraPaymentWriteRepository(sql, OPERATOR)

async function createBooking(
  tableId: string,
  partySize = 2,
  dietaryDisclosure: string | null = null,
) {
  return bookings.createBooking({
    tableId,
    partySize,
    partyType: 'couple',
    primaryGuestName: 'Pay Test',
    dietaryDisclosure,
    policySnapshot: POLICY,
  })
}

async function bookingRow(id: string) {
  const [row] = await sql<
    {
      status: string
      payment_status: string
      refund_status: string
      refund_due_kurus: number
    }[]
  >`
    select status, payment_status, refund_status, refund_due_kurus
    from public.bookings where id = ${id}::uuid
  `
  return row
}

async function cleanup() {
  await sql`
    delete from public.audit_logs
    where entity_id in (
      select b.id from public.bookings b
      join public.hosted_tables t on t.id = b.hosted_table_id
      where t.slug like 'paytest-%'
    )
  `
  await sql`
    delete from public.refunds
    where booking_id in (
      select b.id from public.bookings b
      join public.hosted_tables t on t.id = b.hosted_table_id
      where t.slug like 'paytest-%'
    )
  `
  await sql`
    delete from public.payment_records
    where booking_id in (
      select b.id from public.bookings b
      join public.hosted_tables t on t.id = b.hosted_table_id
      where t.slug like 'paytest-%'
    )
  `
  await sql`
    delete from public.bookings
    where hosted_table_id in (
      select id from public.hosted_tables where slug like 'paytest-%'
    )
  `
  await sql`delete from public.hosted_tables where slug like 'paytest-%'`
  await sql`delete from public.host_payees where provider_code like 'paytest%'`
  await sql`
    delete from public.audit_logs
    where action = 'payee.registered'
      and new_state->>'provider_code' like 'paytest%'
  `
}

beforeEach(cleanup)
afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('recording an authorized payment', () => {
  it('confirms a booking that meets the minimum, at exactly the computed amount', async () => {
    const tableId = await createTable(6, 2)
    const booking = await createBooking(tableId, 2)
    expect(booking.status).toBe('draft')

    const paid = await ledger.recordPaymentAuthorized({
      bookingId: booking.id,
      providerCode: 'mock',
      providerReference: `ref-${booking.id}`,
      providerItemReference: `item-${booking.id}`,
      amountKurus: booking.guestTotalKurus,
      simulated: true,
    })

    // Party of two meets the minimum of two: the dinner is on.
    expect(paid.status).toBe('confirmed')
    expect(paid.paymentStatus).toBe('authorized')

    const [record] = await sql<
      { status: string; provider_item_reference: string }[]
    >`
      select status, provider_item_reference from public.payment_records
      where booking_id = ${booking.id}::uuid
    `
    expect(record.status).toBe('authorized')
    expect(record.provider_item_reference).toBe(`item-${booking.id}`)

    const [audit] = await sql<{ new_state: { amount_kurus: number } }[]>`
      select new_state from public.audit_logs
      where action = 'payment.authorized' and entity_id = ${booking.id}::uuid
    `
    expect(audit.new_state.amount_kurus).toBe(booking.guestTotalKurus)
  })

  it('parks a below-minimum booking at pending_minimum and a pending dietary assessment at payment_authorized', async () => {
    const belowMinimum = await createBooking(await createTable(6, 4), 2)
    const paidBelow = await ledger.recordPaymentAuthorized({
      bookingId: belowMinimum.id,
      providerCode: 'mock',
      providerReference: `ref-${belowMinimum.id}`,
      amountKurus: belowMinimum.guestTotalKurus,
    })
    expect(paidBelow.status).toBe('pending_minimum')

    const withDisclosure = await createBooking(
      await createTable(6, 2),
      2,
      'severe nut allergy',
    )
    expect(withDisclosure.compatibilityStatus).toBe('pending')
    const paidPending = await ledger.recordPaymentAuthorized({
      bookingId: withDisclosure.id,
      providerCode: 'mock',
      providerReference: `ref-${withDisclosure.id}`,
      amountKurus: withDisclosure.guestTotalKurus,
    })
    expect(paidPending.status).toBe('payment_authorized')
  })

  it('refuses any amount other than what the database computed', async () => {
    const booking = await createBooking(await createTable(6), 2)
    await expect(
      ledger.recordPaymentAuthorized({
        bookingId: booking.id,
        providerCode: 'mock',
        providerReference: `ref-${booking.id}`,
        amountKurus: booking.guestTotalKurus - 1,
      }),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' })

    // The refusal left no trace: no record, no status change.
    expect((await bookingRow(booking.id)).payment_status).toBe('not_started')
    const records = await sql`
      select 1 from public.payment_records where booking_id = ${booking.id}::uuid
    `
    expect(records.length).toBe(0)
  })

  it('treats a replayed provider reference as a no-op and a second charge as an error', async () => {
    const booking = await createBooking(await createTable(6), 2)
    const input = {
      bookingId: booking.id,
      providerCode: 'mock',
      providerReference: `ref-${booking.id}`,
      amountKurus: booking.guestTotalKurus,
    }
    await ledger.recordPaymentAuthorized(input)
    // Webhook retry: same reference, same outcome, still one record.
    const replay = await ledger.recordPaymentAuthorized(input)
    expect(replay.paymentStatus).toBe('authorized')
    const records = await sql`
      select 1 from public.payment_records where booking_id = ${booking.id}::uuid
    `
    expect(records.length).toBe(1)

    // A different reference against an already-paid booking is a double
    // charge and must be refused loudly.
    await expect(
      ledger.recordPaymentAuthorized({
        ...input,
        providerReference: `ref-${booking.id}-second`,
      }),
    ).rejects.toMatchObject({ code: 'NOT_PAYABLE' })
  })

  it('records a failure without blocking a later successful attempt', async () => {
    const booking = await createBooking(await createTable(6), 2)
    const failed = await ledger.recordPaymentFailed({
      bookingId: booking.id,
      providerCode: 'mock',
      providerReference: `fail-${booking.id}`,
    })
    expect(failed.paymentStatus).toBe('failed')
    expect(failed.status).toBe('draft')

    const retried = await ledger.recordPaymentAuthorized({
      bookingId: booking.id,
      providerCode: 'mock',
      providerReference: `ref-${booking.id}`,
      amountKurus: booking.guestTotalKurus,
    })
    expect(retried.paymentStatus).toBe('authorized')
  })
})

describe('recording refunds', () => {
  async function paidBooking() {
    const booking = await createBooking(await createTable(6), 2)
    await ledger.recordPaymentAuthorized({
      bookingId: booking.id,
      providerCode: 'mock',
      providerReference: `ref-${booking.id}`,
      amountKurus: booking.guestTotalKurus,
    })
    return booking
  }

  it('accumulates partial refunds and closes the ledger at the full amount', async () => {
    const booking = await paidBooking()
    const half = booking.guestTotalKurus / 2

    const partial = await ledger.recordPaymentRefund({
      bookingId: booking.id,
      amountKurus: half,
      reason: 'cancelled after cutoff',
    })
    expect(partial.paymentStatus).toBe('partially_refunded')

    const full = await ledger.recordPaymentRefund({
      bookingId: booking.id,
      amountKurus: booking.guestTotalKurus - half,
      reason: 'operator override',
    })
    expect(full.paymentStatus).toBe('refunded')

    const rows = await sql`
      select 1 from public.refunds where booking_id = ${booking.id}::uuid
    `
    expect(rows.length).toBe(2)

    await expect(
      ledger.recordPaymentRefund({
        bookingId: booking.id,
        amountKurus: 1,
        reason: 'one kuruş too many',
      }),
    ).rejects.toMatchObject({ code: 'NO_REFUNDABLE_PAYMENT' })
  })

  it('refuses to refund more than was collected, and anything on an unpaid booking', async () => {
    const booking = await paidBooking()
    await expect(
      ledger.recordPaymentRefund({
        bookingId: booking.id,
        amountKurus: booking.guestTotalKurus + 1,
        reason: 'too much',
      }),
    ).rejects.toMatchObject({ code: 'REFUND_EXCEEDS_PAYMENT' })

    const unpaid = await createBooking(await createTable(6), 2)
    await expect(
      ledger.recordPaymentRefund({
        bookingId: unpaid.id,
        amountKurus: 100,
        reason: 'nothing was collected',
      }),
    ).rejects.toMatchObject({ code: 'NO_REFUNDABLE_PAYMENT' })
  })

  it('settles a policy cancellation: cancel computes the debt, the refund pays it', async () => {
    const booking = await paidBooking()

    // Before the cutoff the decided policy refunds 100%.
    await bookings.cancelBooking(booking.id, 'change of plans')
    const cancelled = await bookingRow(booking.id)
    expect(cancelled.refund_status).toBe('requested')
    expect(cancelled.refund_due_kurus).toBe(booking.guestTotalKurus)

    const refunded = await ledger.recordPaymentRefund({
      bookingId: booking.id,
      amountKurus: cancelled.refund_due_kurus,
      reason: 'traveller cancellation before cutoff',
    })
    expect(refunded.paymentStatus).toBe('refunded')
    expect((await bookingRow(booking.id)).refund_status).toBe('completed')
  })
})

describe('host payee registration', () => {
  it('is operator-gated, upserts per provider, and is findable', async () => {
    const [household] = await sql<{ id: string }[]>`
      select id from public.households limit 1
    `

    await expect(
      ledger.registerHostPayee({
        householdId: household.id,
        providerCode: 'paytest-iyzico',
        payeeReference: 'smk-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_OPERATOR' })

    const created = await operatorLedger.registerHostPayee({
      householdId: household.id,
      providerCode: 'paytest-iyzico',
      payeeReference: 'smk-1',
    })
    expect(created.payeeReference).toBe('smk-1')

    // Re-registration (new bank, new key) replaces the reference in place.
    const updated = await operatorLedger.registerHostPayee({
      householdId: household.id,
      providerCode: 'paytest-iyzico',
      payeeReference: 'smk-2',
    })
    expect(updated.id).toBe(created.id)
    expect(updated.payeeReference).toBe('smk-2')

    const found = await operatorLedger.findHostPayee(
      household.id,
      'paytest-iyzico',
    )
    expect(found?.payeeReference).toBe('smk-2')
    expect(
      await operatorLedger.findHostPayee(household.id, 'paytest-none'),
    ).toBeNull()

    await expect(
      operatorLedger.registerHostPayee({
        householdId: '00000000-0000-4000-8000-000000000000',
        providerCode: 'paytest-iyzico',
        payeeReference: 'smk-3',
      }),
    ).rejects.toMatchObject({ code: 'HOUSEHOLD_NOT_FOUND' })
  })
})
