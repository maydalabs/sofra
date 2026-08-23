import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/server/database/database.types'
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

export class SupabaseOperatorReadGateway implements SofraOperatorReadGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async readProfiles(ids: readonly string[]) {
    if (!ids.length) return []
    const { data, error } = await this.client
      .from('profiles')
      .select('id, display_name')
      .in('id', [...ids])
    if (error)
      throw new RepositoryQueryError('list operator profiles', error.message)
    return data
  }

  async readHouseholds(ids: readonly string[]) {
    if (!ids.length) return []
    const { data, error } = await this.client
      .from('households')
      .select('id, public_name, household_structure')
      .in('id', [...ids])
    if (error)
      throw new RepositoryQueryError('list operator households', error.message)
    return data
  }

  async readHostApplications() {
    const { data, error } = await this.client
      .from('host_applications')
      .select(
        'id, applicant_profile_id, household_id, status, motivation, hosting_plan, submitted_at',
      )
      .order('submitted_at', { ascending: true, nullsFirst: false })
    if (error)
      throw new RepositoryQueryError(
        'list operator host applications',
        error.message,
      )
    return data
  }

  async readHostedTables() {
    const { data, error } = await this.client
      .from('hosted_tables')
      .select(
        'id, household_id, starts_at, public_neighborhood, status, menu_title, menu_description, proposed_capacity, certified_capacity, host_net_payout_kurus, guest_price_kurus, expected_household_participants, accessibility_information',
      )
      .order('starts_at', { ascending: true })
    if (error)
      throw new RepositoryQueryError('list operator tables', error.message)
    return data
  }

  async readBookings() {
    const { data, error } = await this.client
      .from('bookings')
      .select('id, hosted_table_id, party_size, guest_total_kurus, status')
      .order('created_at', { ascending: false })
    if (error)
      throw new RepositoryQueryError('list operator bookings', error.message)
    return data
  }

  async readIncidents() {
    const { data, error } = await this.client
      .from('safety_incidents')
      .select(
        'id, booking_id, hosted_table_id, status, severity, confidential_report, created_at',
      )
      .order('created_at', { ascending: false })
    if (error)
      throw new RepositoryQueryError('list operator incidents', error.message)
    return data
  }

  async readPayouts() {
    const { data, error } = await this.client
      .from('payout_records')
      .select('id, hosted_table_id, amount_kurus, status, hold_reason')
      .order('created_at', { ascending: false })
    if (error)
      throw new RepositoryQueryError('list operator payouts', error.message)
    return data
  }

  async readAuditEvents() {
    const { data, error } = await this.client
      .from('audit_logs')
      .select(
        'id, action, entity_type, entity_id, actor_profile_id, reason, occurred_at',
      )
      .order('occurred_at', { ascending: false })
      .limit(100)
    if (error)
      throw new RepositoryQueryError(
        'list operator audit events',
        error.message,
      )
    return data
  }
}
