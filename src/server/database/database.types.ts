/**
 * Generated-shape database types for the checked-in migrations. Regenerate
 * with `pnpm db:types` whenever a local Supabase stack is available.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type HostedTableStatus =
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

export type BookingStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'payment_authorized'
  | 'pending_minimum'
  | 'confirmed'
  | 'cancelled'
  | 'refunded'
  | 'completed'
  | 'disputed'

export type CompatibilityStatus =
  | 'not_required'
  | 'pending'
  | 'accepted'
  | 'declined'

export type PaymentStatus =
  | 'not_started'
  | 'created'
  | 'authorized'
  | 'failed'
  | 'refunded'
  | 'held'

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'declined'
  | 'withdrawn'

export type CertificationStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked'

export type PayoutStatus = 'pending' | 'eligible' | 'held' | 'released'

export type IncidentStatus =
  | 'open'
  | 'triaged'
  | 'investigating'
  | 'resolved'
  | 'closed'

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
      roles: {
        Row: {
          id: string
          code: Database['public']['Enums']['application_role']
          description: string
          created_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
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
        Relationships: [
          {
            foreignKeyName: 'role_assignments_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      households: {
        Row: {
          id: string
          owner_profile_id: string
          public_name: string
          household_structure: string
          public_story: string
          status: 'applicant' | 'certified' | 'suspended' | 'retired'
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      host_applications: {
        Row: {
          id: string
          applicant_profile_id: string
          household_id: string | null
          status: ApplicationStatus
          motivation: string
          hosting_plan: string
          submitted_at: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      host_certifications: {
        Row: {
          id: string
          household_id: string
          lead_host_profile_id: string
          status: CertificationStatus
          certified_traveler_capacity: number
          valid_from: string | null
          valid_until: string | null
          certified_by: string | null
          suspension_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      hosted_tables: {
        Row: {
          id: string
          slug: string
          household_id: string
          lead_verified_host_id: string
          private_address_id: string
          pricing_policy_id: string
          starts_at: string
          timezone: string
          public_neighborhood: string
          public_approximate_latitude: number | null
          public_approximate_longitude: number | null
          format: 'shared' | 'private'
          menu_title: string
          menu_description: string
          atmosphere: string
          languages: string[]
          expected_household_participants: string
          practical_information: string
          accessibility_information: string
          proposed_capacity: number
          certified_capacity: number
          available_seats: number
          minimum_guest_count: number
          guaranteed_operation: boolean
          host_net_payout_kurus: number
          guest_price_kurus: number
          currency: 'TRY'
          booking_cutoff_at: string
          roster_lock_at: string
          status: HostedTableStatus
          published_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
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
          referral_attribution_id: string | null
          party_size: number
          party_type: string
          status: BookingStatus
          compatibility_status: CompatibilityStatus
          payment_status: PaymentStatus
          refund_status: string
          host_net_payout_kurus: number
          sofra_gross_fee_kurus: number
          partner_commission_kurus: number
          guest_total_kurus: number
          take_rate_basis_points: number
          currency: 'TRY'
          policy_snapshot: Json
          table_policy_acknowledged_at: string | null
          compatibility_acknowledged_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      payout_records: {
        Row: {
          id: string
          hosted_table_id: string
          household_id: string
          amount_kurus: number
          currency: 'TRY'
          status: PayoutStatus
          hold_reason: string | null
          released_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      safety_incidents: {
        Row: {
          id: string
          booking_id: string | null
          hosted_table_id: string | null
          reporter_profile_id: string
          status: IncidentStatus
          severity: 'low' | 'medium' | 'high' | 'critical'
          confidential_report: string
          assigned_to: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_profile_id: string | null
          action: string
          entity_type: string
          entity_id: string
          reason: string | null
          previous_state: Json | null
          new_state: Json | null
          occurred_at: string
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
          household_structure: string | null
          lead_host_name: string | null
          starts_at: string | null
          timezone: string | null
          public_neighborhood: string | null
          public_approximate_latitude: number | null
          public_approximate_longitude: number | null
          format: 'shared' | 'private' | null
          menu_title: string | null
          menu_description: string | null
          atmosphere: string | null
          languages: string[] | null
          expected_household_participants: string | null
          practical_information: string | null
          accessibility_information: string | null
          certified_capacity: number | null
          available_seats: number | null
          minimum_guest_count: number | null
          guaranteed_operation: boolean | null
          guest_price_kurus: number | null
          currency: 'TRY' | null
          booking_cutoff_at: string | null
          status: HostedTableStatus | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_booking_summaries: {
        Args: Record<string, never>
        Returns: {
          id: string
          table_id: string
          table_slug: string
          menu_title: string
          household_name: string
          starts_at: string
          public_neighborhood: string
          party_size: number
          party_type: string
          status: BookingStatus
          compatibility_status: CompatibilityStatus
          payment_status: PaymentStatus
          guest_total_kurus: number
        }[]
      }
      get_my_host_roster: {
        Args: { requested_table_id: string }
        Returns: {
          id: string
          table_id: string
          party_size: number
          status: BookingStatus
          compatibility_status: CompatibilityStatus
        }[]
      }
      has_role: {
        Args: {
          required_role: Database['public']['Enums']['application_role']
        }
        Returns: boolean
      }
    }
    Enums: {
      application_role:
        | 'traveler'
        | 'host_applicant'
        | 'certified_host'
        | 'partner_user'
        | 'operator'
        | 'administrator'
      application_status: ApplicationStatus
      certification_status: CertificationStatus
      payout_status: PayoutStatus
      incident_status: IncidentStatus
    }
    CompositeTypes: Record<string, never>
  }
}
