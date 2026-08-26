import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { getDatabase } from '@/server/database/client'

import { PostgresReadGateway } from './gateway'
import { PostgresSofraPostDinnerWriteRepository } from './post-dinner-write-repository'
import { PostgresSofraReadRepository } from './read-repository'

const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

const TRAVELLER = '10000000-0000-4000-8000-000000000008'
const OTHER = '10000000-0000-4000-8000-000000000009'

const repository = new PostgresSofraPostDinnerWriteRepository(sql, TRAVELLER)
const intruder = new PostgresSofraPostDinnerWriteRepository(sql, OTHER)

const SECRET = 'CONFIDENTIAL-REPORT-TEXT-9f3a'
const PRIVATE_NOTE = 'PRIVATE-FEEDBACK-TEXT-4b2c'

let bookingId: string
let payoutId: string

async function cleanup() {
  await sql`delete from public.safety_incidents where confidential_report = ${SECRET}`
  await sql`delete from public.private_constructive_feedback where body = ${PRIVATE_NOTE}`
  await sql`delete from public.public_experience_reviews where title like 'ITEST%'`
  await sql`delete from public.payout_records where amount_kurus = 987654`
  await sql`delete from public.audit_logs where actor_profile_id = ${TRAVELLER}::uuid`
  await sql`delete from public.bookings where party_type = 'colleagues'`
}

/** A completed dinner with a pending payout -- the state these channels open in. */
async function givenCompletedDinner() {
  const [table] = await sql<{ id: string; household_id: string }[]>`
    select id, household_id from public.hosted_tables limit 1
  `
  const [booking] = await sql<{ id: string }[]>`
    insert into public.bookings (
      hosted_table_id, primary_traveler_id, party_size, party_type, status,
      host_net_payout_kurus, sofra_gross_fee_kurus, guest_total_kurus,
      take_rate_basis_points, policy_snapshot
    ) values (
      ${table.id}::uuid, ${TRAVELLER}::uuid, 2, 'colleagues', 'completed',
      90000, 30000, 120000, 2500, '{}'::jsonb
    ) returning id
  `
  bookingId = booking.id
  const [payout] = await sql<{ id: string }[]>`
    insert into public.payout_records (hosted_table_id, household_id, amount_kurus, status)
    values (${table.id}::uuid, ${table.household_id}::uuid, 987654, 'eligible')
    returning id
  `
  payoutId = payout.id
}

beforeEach(async () => {
  await cleanup()
  await givenCompletedDinner()
})

afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('public experience review', () => {
  it('is created unpublished, awaiting moderation', async () => {
    const review = await repository.submitPublicReview({
      bookingId,
      rating: 5,
      title: 'ITEST A warm evening',
      body: 'A review body that is long enough to satisfy the domain rules.',
    })
    expect(review.rating).toBe(5)
    expect(review.publishedAt).toBeNull()
  })

  it('stays out of the publicly readable set until moderated', async () => {
    await repository.submitPublicReview({
      bookingId,
      rating: 5,
      title: 'ITEST Pending',
      body: 'A review body that is long enough to satisfy the domain rules.',
    })
    // The public reviews policy exposes only rows with published_at set.
    const visible = await sql`
      select * from public.public_experience_reviews
      where booking_id = ${bookingId}::uuid and published_at is not null
    `
    expect(visible).toHaveLength(0)
  })

  it('refuses a second review for the same dinner', async () => {
    const input = {
      bookingId,
      rating: 4,
      title: 'ITEST Once',
      body: 'A review body that is long enough to satisfy the domain rules.',
    }
    await repository.submitPublicReview(input)
    await expect(repository.submitPublicReview(input)).rejects.toMatchObject({
      code: 'ALREADY_REVIEWED',
    })
  })

  it('refuses a review from someone else’s account', async () => {
    await expect(
      intruder.submitPublicReview({
        bookingId,
        rating: 5,
        title: 'ITEST Intruder',
        body: 'A review body that is long enough to satisfy the domain rules.',
      }),
    ).rejects.toMatchObject({ code: 'BOOKING_NOT_OWNED' })
  })

  it('refuses a review before the dinner is completed', async () => {
    await sql`update public.bookings set status = 'confirmed' where id = ${bookingId}::uuid`
    await expect(
      repository.submitPublicReview({
        bookingId,
        rating: 5,
        title: 'ITEST Early',
        body: 'A review body that is long enough to satisfy the domain rules.',
      }),
    ).rejects.toMatchObject({ code: 'DINNER_NOT_COMPLETED' })
  })
})

describe('private constructive feedback', () => {
  it('stores the note without echoing it back', async () => {
    const feedback = await repository.submitPrivateFeedback({
      bookingId,
      body: PRIVATE_NOTE,
    })
    expect(JSON.stringify(feedback)).not.toContain(PRIVATE_NOTE)

    const [stored] = await sql`
      select body from public.private_constructive_feedback
      where id = ${feedback.id}::uuid
    `
    expect(stored.body).toBe(PRIVATE_NOTE)
  })

  it('keeps the note out of the audit trail', async () => {
    await repository.submitPrivateFeedback({ bookingId, body: PRIVATE_NOTE })
    const audits = await sql`
      select * from public.audit_logs where action = 'private_feedback.submitted'
    `
    expect(JSON.stringify(audits)).not.toContain(PRIVATE_NOTE)
  })
})

describe('confidential safety report', () => {
  it('opens an incident and holds the payout in the same transaction', async () => {
    const report = await repository.reportSafetyIncident({
      bookingId,
      severity: 'high',
      confidentialReport: SECRET,
    })
    expect(report.status).toBe('open')
    expect(report.severity).toBe('high')
    expect(report.payoutsHeld).toBeGreaterThan(0)

    const [payout] = await sql`
      select status, hold_reason from public.payout_records where id = ${payoutId}::uuid
    `
    expect(payout.status).toBe('held')
    expect(payout.hold_reason).toBe('Open safety report')
  })

  it('never returns the confidential text to the caller', async () => {
    const report = await repository.reportSafetyIncident({
      bookingId,
      severity: 'critical',
      confidentialReport: SECRET,
    })
    expect(JSON.stringify(report)).not.toContain(SECRET)
    expect(report).not.toHaveProperty('confidentialReport')
    expect(report).not.toHaveProperty('confidential_report')
  })

  it('never writes the confidential text into the audit trail', async () => {
    await repository.reportSafetyIncident({
      bookingId,
      severity: 'high',
      confidentialReport: SECRET,
    })
    const audits = await sql`select * from public.audit_logs`
    expect(JSON.stringify(audits)).not.toContain(SECRET)
  })

  it('never leaks the report into the public projection of that table', async () => {
    await repository.reportSafetyIncident({
      bookingId,
      severity: 'critical',
      confidentialReport: SECRET,
    })
    const publicRepo = new PostgresSofraReadRepository(
      new PostgresReadGateway(sql),
    )
    const tables = await publicRepo.listPublicTables()
    expect(JSON.stringify(tables)).not.toContain(SECRET)
  })

  it('refuses a report from someone else’s account', async () => {
    await expect(
      intruder.reportSafetyIncident({
        bookingId,
        severity: 'high',
        confidentialReport: SECRET,
      }),
    ).rejects.toMatchObject({ code: 'BOOKING_NOT_OWNED' })
  })

  it('rejects an unknown severity', async () => {
    await expect(
      repository.reportSafetyIncident({
        bookingId,
        severity: 'catastrophic',
        confidentialReport: SECRET,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })
})

describe('the three channels stay separate', () => {
  it('keeps private and safety text out of the public review row', async () => {
    await repository.submitPublicReview({
      bookingId,
      rating: 5,
      title: 'ITEST Separation',
      body: 'A review body that is long enough to satisfy the domain rules.',
    })
    await repository.submitPrivateFeedback({ bookingId, body: PRIVATE_NOTE })
    await repository.reportSafetyIncident({
      bookingId,
      severity: 'high',
      confidentialReport: SECRET,
    })

    const [review] = await sql`
      select * from public.public_experience_reviews where booking_id = ${bookingId}::uuid
    `
    const serialised = JSON.stringify(review)
    expect(serialised).not.toContain(PRIVATE_NOTE)
    expect(serialised).not.toContain(SECRET)
  })
})
