import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database } from '@/server/database/database.types'
import {
  HostWriteError,
  type DwellingType,
  type CreateHostedTableDraftInput,
  type HostAddressInput,
  type HostAddressRecord,
  type HostApplicationRecord,
  type HostWriteErrorCode,
  type HostedTableWriteRecord,
  type SofraHostWriteRepository,
  type SubmitHostApplicationInput,
} from '../write-contracts'

type AddressRow =
  Database['public']['Tables']['household_private_addresses']['Row']

const dwellingTypes = ['apartment_flat', 'detached_house', 'other'] as const

/** The CHECK constraint guarantees the value; drift means the row is untrusted. */
function toDwellingType(value: string | null): DwellingType | null {
  if (value === null) return null
  if (!(dwellingTypes as readonly string[]).includes(value)) {
    throw new HostWriteError('ADDRESS_INCOMPLETE', 'unknown dwelling type')
  }
  return value as DwellingType
}
type ApplicationRow = Database['public']['Tables']['host_applications']['Row']
type HostedTableRow = Database['public']['Tables']['hosted_tables']['Row']

/**
 * SQLSTATE codes raised by the host lifecycle functions. Enforcement lives in
 * the database so a caller that bypasses this repository still cannot skip a
 * certification check, a scheduling window, or the active-table limit.
 */
const errorCodesBySqlState: Record<string, HostWriteErrorCode> = {
  SF001: 'TABLE_NOT_FOUND',
  SF002: 'TABLE_NOT_EDITABLE',
  SF006: 'NO_PRICING_POLICY',
  SF010: 'APPLICATION_IN_PROGRESS',
  SF031: 'ADDRESS_INCOMPLETE',
  SF011: 'NO_CERTIFIED_HOUSEHOLD',
  SF012: 'NO_ACTIVE_CERTIFICATION',
  SF013: 'NO_VERIFIED_ADDRESS',
  SF014: 'CAPACITY_EXCEEDS_CERTIFICATION',
  SF015: 'SCHEDULE_OUT_OF_WINDOW',
  SF016: 'ACTIVE_TABLE_LIMIT_REACHED',
}

function toHostWriteError(error: unknown): HostWriteError {
  const sqlState =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''
  const code = errorCodesBySqlState[sqlState]
  if (!code) throw error
  return new HostWriteError(
    code,
    error instanceof Error ? error.message : String(error),
  )
}

function toApplication(row: ApplicationRow): HostApplicationRecord {
  return {
    id: row.id,
    householdId: row.household_id,
    status: row.status,
    submittedAt: row.submitted_at,
  }
}

function toTable(row: HostedTableRow): HostedTableWriteRecord {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    startsAt: row.starts_at,
    proposedCapacity: row.proposed_capacity,
    hostNetPayoutKurus: row.host_net_payout_kurus,
    guestPriceKurus: row.guest_price_kurus,
  }
}

export class PostgresSofraHostWriteRepository implements SofraHostWriteRepository {
  constructor(
    private readonly sql: SofraDatabase,
    private readonly actorId: string,
  ) {}

  async submitHostAddress(input: HostAddressInput): Promise<HostAddressRecord> {
    try {
      const rows = await this.sql<AddressRow[]>`
        select * from public.submit_host_address(
          ${this.actorId}::uuid,
          ${input.addressLine1}::text,
          ${input.addressLine2 ?? null}::text,
          ${input.district}::text,
          ${input.city}::text,
          ${input.postalCode ?? null}::text,
          ${input.arrivalInstructions ?? null}::text,
          ${input.dwellingType ?? null}::text
        )
      `
      const row = rows[0]
      // The full address is never echoed back; the caller confirmed what they
      // typed and needs only the verification state.
      return {
        id: row.id,
        district: row.district,
        city: row.city,
        dwellingType: toDwellingType(row.dwelling_type),
        verifiedAt: row.verified_at,
      }
    } catch (error) {
      const mapped = toHostWriteError(error)
      // SF011 means "no household" on this path, not "no certified household":
      // an applicant household is an acceptable target for an address.
      if (mapped.code === 'NO_CERTIFIED_HOUSEHOLD') {
        throw new HostWriteError('NO_HOUSEHOLD', mapped.message)
      }
      throw mapped
    }
  }

  async submitHostApplication(input: SubmitHostApplicationInput) {
    try {
      const rows = await this.sql<ApplicationRow[]>`
        select * from public.submit_host_application(
          ${this.actorId}::uuid,
          ${input.householdName}::text,
          ${input.neighborhood}::text,
          ${input.story}::text,
          ${input.motivation}::text,
          ${input.participation}::text
        )
      `
      return toApplication(rows[0])
    } catch (error) {
      // SF001 means the profile is missing on this path, not a table.
      const mapped = toHostWriteError(error)
      if (mapped.code === 'TABLE_NOT_FOUND') {
        throw new HostWriteError('PROFILE_NOT_FOUND', mapped.message)
      }
      throw mapped
    }
  }

  async createHostedTableDraft(input: CreateHostedTableDraftInput) {
    try {
      const rows = await this.sql<HostedTableRow[]>`
        select * from public.create_hosted_table_draft(
          ${this.actorId}::uuid,
          ${input.menuTitle}::text,
          ${input.menuDescription}::text,
          ${input.startsAt}::timestamptz,
          ${input.format}::public.table_format,
          ${input.proposedCapacity}::integer,
          ${input.minimumGuestCount}::integer,
          ${input.hostNetPayoutKurus}::integer,
          ${input.atmosphere}::text,
          ${input.expectedHouseholdParticipants}::text,
          ${input.practicalInformation}::text,
          ${input.accessibilityInformation ?? ''}::text
        )
      `
      return toTable(rows[0])
    } catch (error) {
      throw toHostWriteError(error)
    }
  }

  async submitHostedTable(tableId: string) {
    try {
      const rows = await this.sql<HostedTableRow[]>`
        select * from public.submit_hosted_table(
          ${this.actorId}::uuid,
          ${tableId}::uuid
        )
      `
      return toTable(rows[0])
    } catch (error) {
      throw toHostWriteError(error)
    }
  }
}
