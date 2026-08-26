import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { calculateGuestPrice } from '@/features/pricing/pricing'
import { getDatabase } from '@/server/database/client'

import { PostgresSofraHostWriteRepository } from './host-write-repository'

const database = getDatabase()
if (!database) throw new Error('DATABASE_URL is required for integration tests')
const sql = database

/**
 * Host lifecycle writes against a real database.
 *
 * Each test builds its own household so the fixtures' active-table counts and
 * certifications are never disturbed.
 */
const TEST_PROFILE = '90000000-0000-4000-8000-000000000001'
const TEST_HOUSEHOLD = '90000000-0000-4000-8000-000000000002'
const TEST_ADDRESS = '90000000-0000-4000-8000-000000000003'
const TEST_CERT = '90000000-0000-4000-8000-000000000004'
const CERTIFIED_CAPACITY = 6

const repository = new PostgresSofraHostWriteRepository(sql, TEST_PROFILE)

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

async function cleanup() {
  await sql`
    delete from public.audit_logs
    where actor_profile_id = ${TEST_PROFILE}::uuid
  `
  await sql`
    delete from public.hosted_tables
    where household_id in (
      select id from public.households where owner_profile_id = ${TEST_PROFILE}::uuid
    )
  `
  await sql`delete from public.host_applications where applicant_profile_id = ${TEST_PROFILE}::uuid`
  await sql`delete from public.host_certifications where lead_host_profile_id = ${TEST_PROFILE}::uuid`
  await sql`
    delete from public.household_private_addresses
    where household_id in (
      select id from public.households where owner_profile_id = ${TEST_PROFILE}::uuid
    )
  `
  await sql`delete from public.role_assignments where profile_id = ${TEST_PROFILE}::uuid`
  await sql`delete from public.households where owner_profile_id = ${TEST_PROFILE}::uuid`
  await sql`delete from public.profiles where id = ${TEST_PROFILE}::uuid`
}

/** A profile with no household yet -- the state a real applicant is in. */
async function givenApplicant() {
  await sql`
    insert into public.profiles (id, display_name)
    values (${TEST_PROFILE}::uuid, 'Test Applicant')
  `
}

/** A certified household ready to schedule tables. */
async function givenCertifiedHost() {
  await givenApplicant()
  await sql`
    insert into public.households (id, owner_profile_id, public_name, public_story, household_structure, status)
    values (${TEST_HOUSEHOLD}::uuid, ${TEST_PROFILE}::uuid, 'Test household', 'story', 'structure', 'certified')
  `
  await sql`
    insert into public.household_private_addresses (id, household_id, address_line_1, district, city)
    values (${TEST_ADDRESS}::uuid, ${TEST_HOUSEHOLD}::uuid, 'PRIVATE', 'Kadıköy', 'İstanbul')
  `
  await sql`
    insert into public.host_certifications (id, household_id, lead_host_profile_id, status, certified_traveler_capacity, valid_from)
    values (${TEST_CERT}::uuid, ${TEST_HOUSEHOLD}::uuid, ${TEST_PROFILE}::uuid, 'active', ${CERTIFIED_CAPACITY}, now())
  `
}

const draft = {
  menuTitle: 'Ev yemeği: kuru fasulye',
  menuDescription: 'A description of the household menu.',
  startsAt: inDays(14),
  format: 'shared' as const,
  proposedCapacity: 4,
  minimumGuestCount: 2,
  hostNetPayoutKurus: 120_000,
  atmosphere: 'warm',
  expectedHouseholdParticipants: 'Two adult hosts',
  practicalInformation: 'Practical information.',
}

beforeEach(cleanup)
afterAll(async () => {
  await cleanup()
  await sql.end()
})

describe('submitHostApplication', () => {
  it('creates the household, the application, and the applicant role', async () => {
    await givenApplicant()
    const application = await repository.submitHostApplication({
      householdName: 'Ayla ve Mert’in sofrası',
      neighborhood: 'Moda',
      story: 'A story about the household long enough to be meaningful.',
      motivation: 'A motivation about why they want to host travellers.',
      participation: 'Both adults eat with guests.',
    })

    expect(application.status).toBe('submitted')
    expect(application.submittedAt).not.toBeNull()
    expect(application.householdId).not.toBeNull()

    const [household] = await sql`
      select * from public.households where id = ${application.householdId}::uuid
    `
    expect(household.status).toBe('applicant')
    expect(household.owner_profile_id).toBe(TEST_PROFILE)

    const roles = await sql<{ code: string }[]>`
      select r.code from public.role_assignments ra
      join public.roles r on r.id = ra.role_id
      where ra.profile_id = ${TEST_PROFILE}::uuid
    `
    expect(roles.map((r) => r.code)).toContain('host_applicant')
  })

  it('records the neighbourhood the form collects', async () => {
    await givenApplicant()
    const application = await repository.submitHostApplication({
      householdName: 'Household',
      neighborhood: 'Moda',
      story: 'story',
      motivation: 'motivation',
      participation: 'participation',
    })
    const [row] = await sql`
      select applicant_neighborhood from public.host_applications
      where id = ${application.id}::uuid
    `
    expect(row.applicant_neighborhood).toBe('Moda')
  })

  it('refuses a second application while one is in progress', async () => {
    await givenApplicant()
    const input = {
      householdName: 'Household',
      neighborhood: 'Moda',
      story: 'story',
      motivation: 'motivation',
      participation: 'participation',
    }
    await repository.submitHostApplication(input)
    await expect(repository.submitHostApplication(input)).rejects.toMatchObject(
      {
        code: 'APPLICATION_IN_PROGRESS',
      },
    )
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from public.host_applications
      where applicant_profile_id = ${TEST_PROFILE}::uuid
    `
    expect(count).toBe(1)
  })
})

describe('createHostedTableDraft', () => {
  beforeEach(givenCertifiedHost)

  it('creates a draft with a slug and derived scheduling windows', async () => {
    const table = await repository.createHostedTableDraft(draft)
    expect(table.status).toBe('draft')
    // Turkish characters are transliterated, not stripped.
    expect(table.slug).toMatch(/^ev-yemegi-kuru-fasulye-[0-9a-f]{6}$/)

    const [row] = await sql`
      select * from public.hosted_tables where id = ${table.id}::uuid
    `
    expect(new Date(row.booking_cutoff_at).getTime()).toBeLessThan(
      new Date(row.roster_lock_at).getTime(),
    )
    expect(new Date(row.roster_lock_at).getTime()).toBeLessThan(
      new Date(row.starts_at).getTime(),
    )
    // The public neighbourhood comes from the private address district; the
    // address itself must never be copied onto the table.
    expect(row.public_neighborhood).toBe('Kadıköy')
    expect(JSON.stringify(row)).not.toContain('PRIVATE')
  })

  it('derives the guest price exactly as the TypeScript pricing rule does', async () => {
    const table = await repository.createHostedTableDraft(draft)
    const expected = calculateGuestPrice(draft.hostNetPayoutKurus, {
      currency: 'TRY',
      takeRateBasisPoints: 2_500,
    })
    expect(table.guestPriceKurus).toBe(expected.guestTotalKurus)
    // Ceiling division: the host never loses a kuruş to rounding.
    expect(table.guestPriceKurus * 7_500).toBeGreaterThanOrEqual(
      draft.hostNetPayoutKurus * 10_000,
    )
  })

  it('refuses a capacity above the certification', async () => {
    await expect(
      repository.createHostedTableDraft({
        ...draft,
        proposedCapacity: CERTIFIED_CAPACITY + 1,
      }),
    ).rejects.toMatchObject({ code: 'CAPACITY_EXCEEDS_CERTIFICATION' })
  })

  it('refuses a dinner inside the minimum lead time', async () => {
    await expect(
      repository.createHostedTableDraft({ ...draft, startsAt: inDays(2) }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_OUT_OF_WINDOW' })
  })

  it('refuses a dinner beyond the publishing horizon', async () => {
    await expect(
      repository.createHostedTableDraft({ ...draft, startsAt: inDays(120) }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_OUT_OF_WINDOW' })
  })

  it('enforces the new-host active table limit', async () => {
    await repository.createHostedTableDraft(draft)
    await repository.createHostedTableDraft({ ...draft, startsAt: inDays(15) })
    await expect(
      repository.createHostedTableDraft({ ...draft, startsAt: inDays(16) }),
    ).rejects.toMatchObject({ code: 'ACTIVE_TABLE_LIMIT_REACHED' })
  })

  it('refuses a host with no certified household', async () => {
    await cleanup()
    await givenApplicant()
    await expect(
      repository.createHostedTableDraft(draft),
    ).rejects.toMatchObject({ code: 'NO_CERTIFIED_HOUSEHOLD' })
  })
})

describe('submitHostedTable', () => {
  beforeEach(givenCertifiedHost)

  it('moves a draft to submitted and audits the transition', async () => {
    const table = await repository.createHostedTableDraft(draft)
    const submitted = await repository.submitHostedTable(table.id)
    expect(submitted.status).toBe('submitted')

    const [audit] = await sql`
      select * from public.audit_logs
      where entity_id = ${table.id}::uuid and action = 'hosted_table.submitted'
    `
    expect(audit.previous_state.status).toBe('draft')
    expect(audit.new_state.status).toBe('submitted')
  })

  it('refuses to submit the same table twice', async () => {
    const table = await repository.createHostedTableDraft(draft)
    await repository.submitHostedTable(table.id)
    await expect(repository.submitHostedTable(table.id)).rejects.toMatchObject({
      code: 'TABLE_NOT_EDITABLE',
    })
  })

  it('refuses to submit a table owned by another household', async () => {
    const [foreign] = await sql<{ id: string }[]>`
      select t.id from public.hosted_tables t
      join public.households h on h.id = t.household_id
      where h.owner_profile_id <> ${TEST_PROFILE}::uuid
      limit 1
    `
    await expect(
      repository.submitHostedTable(foreign.id),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_FOUND' })
  })

  it('refuses when the certification is no longer active', async () => {
    const table = await repository.createHostedTableDraft(draft)
    await sql`
      update public.host_certifications set status = 'suspended'
      where id = ${TEST_CERT}::uuid
    `
    await expect(repository.submitHostedTable(table.id)).rejects.toMatchObject({
      code: 'NO_ACTIVE_CERTIFICATION',
    })
  })
})
