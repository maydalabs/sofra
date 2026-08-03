/**
 * Generated-shape database types for the checked-in migration. Regenerate with
 * `pnpm db:types` whenever a local Supabase stack is available.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          preferred_locale: 'en' | 'tr'
          phone_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          preferred_locale?: 'en' | 'tr'
          phone_verified_at?: string | null
        }
        Update: {
          display_name?: string
          preferred_locale?: 'en' | 'tr'
          phone_verified_at?: string | null
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          id: string
          profile_id: string
          role_id: string
          assigned_by: string | null
          assigned_at: string
          revoked_at: string | null
        }
        Insert: {
          profile_id: string
          role_id: string
          assigned_by?: string | null
        }
        Update: { revoked_at?: string | null }
        Relationships: []
      }
      hosted_tables: {
        Row: {
          id: string
          slug: string
          household_id: string
          lead_verified_host_id: string
          private_address_id: string
          starts_at: string
          public_neighborhood: string
          format: 'shared' | 'private'
          menu_title: string
          menu_description: string
          proposed_capacity: number
          certified_capacity: number
          available_seats: number
          host_net_payout_kurus: number
          guest_price_kurus: number
          status:
            | 'draft'
            | 'submitted'
            | 'changes_requested'
            | 'approved'
            | 'published'
            | 'minimum_reached'
            | 'confirmed'
            | 'roster_locked'
            | 'completed'
            | 'cancelled'
            | 'archived'
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          hosted_table_id: string
          primary_traveler_id: string
          party_size: number
          status:
            | 'draft'
            | 'awaiting_payment'
            | 'payment_authorized'
            | 'pending_minimum'
            | 'confirmed'
            | 'cancelled'
            | 'refunded'
            | 'completed'
            | 'disputed'
          compatibility_status: 'not_required' | 'pending' | 'accepted' | 'declined'
          guest_total_kurus: number
          currency: 'TRY'
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: {
      published_hosted_tables: {
        Row: {
          id: string | null
          slug: string | null
          household_name: string | null
          household_story: string | null
          lead_host_name: string | null
          starts_at: string | null
          public_neighborhood: string | null
          format: 'shared' | 'private' | null
          menu_title: string | null
          menu_description: string | null
          available_seats: number | null
          guest_price_kurus: number | null
          currency: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: { Args: { required_role: Database['public']['Enums']['application_role'] }; Returns: boolean }
    }
    Enums: {
      application_role:
        | 'traveler'
        | 'host_applicant'
        | 'certified_host'
        | 'partner_user'
        | 'operator'
        | 'administrator'
    }
    CompositeTypes: Record<string, never>
  }
}

