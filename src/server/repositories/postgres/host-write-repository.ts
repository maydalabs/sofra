import 'server-only'

import type { SofraDatabase } from '@/server/database/client'
import type { Database } from '@/server/database/database.types'
import {
  HostWriteError,
  type CreateHostedTableDraftInput,
  type HostApplicationRecord,
  type HostWriteErrorCode,
  type HostedTableWriteRecord,
  type SofraHostWriteRepository,
  type SubmitHostApplicationInput,
} from '../write-contracts'

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
