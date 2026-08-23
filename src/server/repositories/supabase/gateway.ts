import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { RepositoryQueryError } from '../errors'
import type { Database } from '@/server/database/database.types'

export type PublishedTableRow =
  Database['public']['Views']['published_hosted_tables']['Row']
export type TravelerBookingRow =
  Database['public']['Functions']['get_my_booking_summaries']['Returns'][number]
export type HouseholdRow = Database['public']['Tables']['households']['Row']
export type HostedTableRow =
  Database['public']['Tables']['hosted_tables']['Row']

export interface SofraReadGateway {
  readPublishedTables(): Promise<PublishedTableRow[]>
  readPublishedTableBySlug(slug: string): Promise<PublishedTableRow | undefined>
  readTravelerBookings(): Promise<TravelerBookingRow[]>
  readOwnedHouseholds(ownerProfileId: string): Promise<HouseholdRow[]>
  readHostedTables(householdIds: readonly string[]): Promise<HostedTableRow[]>
}

export class SupabaseReadGateway implements SofraReadGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async readPublishedTables() {
    const { data, error } = await this.client
      .from('published_hosted_tables')
      .select('*')
      .order('starts_at', { ascending: true })
    if (error)
      throw new RepositoryQueryError('list public tables', error.message)
    return data
  }

  async readPublishedTableBySlug(slug: string) {
    const { data, error } = await this.client
      .from('published_hosted_tables')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error)
      throw new RepositoryQueryError('find public table', error.message)
    return data ?? undefined
  }

  async readTravelerBookings() {
    const { data, error } = await this.client.rpc('get_my_booking_summaries')
    if (error) {
      throw new RepositoryQueryError('list traveler bookings', error.message)
    }
    return data
  }

  async readOwnedHouseholds(ownerProfileId: string) {
    const { data, error } = await this.client
      .from('households')
      .select('*')
      .eq('owner_profile_id', ownerProfileId)
    if (error)
      throw new RepositoryQueryError('list owned households', error.message)
    return data
  }

  async readHostedTables(householdIds: readonly string[]) {
    if (!householdIds.length) return []
    const { data, error } = await this.client
      .from('hosted_tables')
      .select('*')
      .in('household_id', [...householdIds])
      .order('starts_at', { ascending: true })
    if (error)
      throw new RepositoryQueryError('list hosted tables', error.message)
    return data
  }
}
