import 'server-only'

import type { Database } from '@/server/database/database.types'
import type { SofraDatabase } from '@/server/database/client'
import { RepositoryQueryError } from '@/server/repositories/errors'

type Tables = Database['public']['Tables']

export type OperatorProfileRow = Pick<
  Tables['profiles']['Row'],
  'id' | 'display_name'
>
export type OperatorHouseholdRow = Pick<
  Tables['households']['Row'],
  'id' | 'public_name' | 'household_structure'
>
export type OperatorHostApplicationRow = Pick<
  Tables['host_applications']['Row'],
  | 'id'
  | 'applicant_profile_id'
  | 'household_id'
  | 'status'
  | 'motivation'
  | 'hosting_plan'
  | 'submitted_at'
>
export type OperatorHostedTableRow = Pick<
  Tables['hosted_tables']['Row'],
  | 'id'
  | 'household_id'
  | 'starts_at'
  | 'public_neighborhood'
  | 'status'
  | 'menu_title'
  | 'menu_description'
  | 'proposed_capacity'
  | 'certified_capacity'
  | 'host_net_payout_kurus'
  | 'guest_price_kurus'
  | 'expected_household_participants'
  | 'accessibility_information'
>
export type OperatorBookingRow = Pick<
  Tables['bookings']['Row'],
  'id' | 'hosted_table_id' | 'party_size' | 'guest_total_kurus' | 'status'
>
export type OperatorIncidentRow = Pick<
  Tables['safety_incidents']['Row'],
  | 'id'
  | 'booking_id'
  | 'hosted_table_id'
  | 'status'
  | 'severity'
  | 'confidential_report'
  | 'created_at'
>
export type OperatorPayoutRow = Pick<
  Tables['payout_records']['Row'],
  'id' | 'hosted_table_id' | 'amount_kurus' | 'status' | 'hold_reason'
>
export type OperatorAuditRow = Pick<
  Tables['audit_logs']['Row'],
  | 'id'
  | 'action'
  | 'entity_type'
  | 'entity_id'
  | 'actor_profile_id'
  | 'reason'
  | 'occurred_at'
>

export interface SofraOperatorReadGateway {
  readProfiles(ids: readonly string[]): Promise<OperatorProfileRow[]>
  readHouseholds(ids: readonly string[]): Promise<OperatorHouseholdRow[]>
  readHostApplications(): Promise<OperatorHostApplicationRow[]>
  readHostedTables(): Promise<OperatorHostedTableRow[]>
  readBookings(): Promise<OperatorBookingRow[]>
  readIncidents(): Promise<OperatorIncidentRow[]>
  readPayouts(): Promise<OperatorPayoutRow[]>
  readAuditEvents(): Promise<OperatorAuditRow[]>
}

export class PostgresOperatorReadGateway implements SofraOperatorReadGateway {
  constructor(private readonly sql: SofraDatabase) {}

  private async run<T>(operation: string, query: () => Promise<T>) {
    try {
      return await query()
    } catch (error) {
      throw new RepositoryQueryError(
        operation,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  async readProfiles(ids: readonly string[]) {
    if (!ids.length) return []
    return this.run('list operator profiles', async () => {
      const rows = await this.sql<OperatorProfileRow[]>`
        select id, display_name from public.profiles
        where id = any(${this.sql.array([...ids])}::uuid[])
      `
      return [...rows]
    })
  }

  async readHouseholds(ids: readonly string[]) {
    if (!ids.length) return []
    return this.run('list operator households', async () => {
      const rows = await this.sql<OperatorHouseholdRow[]>`
        select id, public_name, household_structure from public.households
        where id = any(${this.sql.array([...ids])}::uuid[])
      `
      return [...rows]
    })
  }

  async readHostApplications() {
    return this.run('list operator host applications', async () => {
      const rows = await this.sql<OperatorHostApplicationRow[]>`
        select id, applicant_profile_id, household_id, status, motivation,
               hosting_plan, submitted_at
        from public.host_applications
        order by submitted_at asc nulls last
      `
      return [...rows]
    })
  }

  async readHostedTables() {
    return this.run('list operator tables', async () => {
      const rows = await this.sql<OperatorHostedTableRow[]>`
        select id, household_id, starts_at, public_neighborhood, status,
               menu_title, menu_description, proposed_capacity,
               certified_capacity, host_net_payout_kurus, guest_price_kurus,
               expected_household_participants, accessibility_information
        from public.hosted_tables
        order by starts_at asc
      `
      return [...rows]
    })
  }

  async readBookings() {
    return this.run('list operator bookings', async () => {
      const rows = await this.sql<OperatorBookingRow[]>`
        select id, hosted_table_id, party_size, guest_total_kurus, status
        from public.bookings
        order by created_at desc
      `
      return [...rows]
    })
  }

  async readIncidents() {
    return this.run('list operator incidents', async () => {
      const rows = await this.sql<OperatorIncidentRow[]>`
        select id, booking_id, hosted_table_id, status, severity,
               confidential_report, created_at
        from public.safety_incidents
        order by created_at desc
      `
      return [...rows]
    })
  }

  async readPayouts() {
    return this.run('list operator payouts', async () => {
      const rows = await this.sql<OperatorPayoutRow[]>`
        select id, hosted_table_id, amount_kurus, status, hold_reason
        from public.payout_records
        order by created_at desc
      `
      return [...rows]
    })
  }

  async readAuditEvents() {
    return this.run('list operator audit events', async () => {
      const rows = await this.sql<OperatorAuditRow[]>`
        select id, action, entity_type, entity_id, actor_profile_id, reason,
               occurred_at
        from public.audit_logs
        order by occurred_at desc
        limit 100
      `
      return [...rows]
    })
  }
}
