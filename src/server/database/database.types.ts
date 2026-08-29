/**
 * GENERATED FILE -- do not edit by hand.
 *
 * Regenerate against the running database with:
 *   pnpm db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ApplicationRole =
  | 'traveler'
  | 'host_applicant'
  | 'certified_host'
  | 'partner_user'
  | 'operator'
  | 'administrator'

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'declined'
  | 'withdrawn'

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

export type CertificationStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'revoked'

export type CompatibilityStatus =
  | 'not_required'
  | 'pending'
  | 'accepted'
  | 'declined'

export type DietaryKind =
  | 'allergy'
  | 'intolerance'
  | 'dietary_restriction'
  | 'religious_food_restriction'
  | 'preference'
  | 'undetermined'

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

export type IncidentStatus =
  | 'open'
  | 'triaged'
  | 'investigating'
  | 'resolved'
  | 'closed'

export type PaymentStatus =
  | 'not_started'
  | 'created'
  | 'authorized'
  | 'failed'
  | 'refunded'
  | 'held'

export type PayoutStatus =
  | 'pending'
  | 'eligible'
  | 'held'
  | 'released'

export type TableFormat =
  | 'shared'
  | 'private'

export interface Database {
  public: {
    Tables: {
      administrative_notes: {
        Row: {
          id: string
          actor_profile_id: string
          entity_type: string
          entity_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          actor_profile_id: string
          entity_type: string
          entity_id: string
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          actor_profile_id?: string
          entity_type?: string
          entity_id?: string
          note?: string
          created_at?: string
        }
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
        Insert: {
          id?: string
          actor_profile_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          reason?: string | null
          previous_state?: Json | null
          new_state?: Json | null
          occurred_at?: string
        }
        Update: {
          id?: string
          actor_profile_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          reason?: string | null
          previous_state?: Json | null
          new_state?: Json | null
          occurred_at?: string
        }
      }
      booking_guests: {
        Row: {
          id: string
          booking_id: string
          full_name: string
          email: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          full_name: string
          email?: string | null
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          full_name?: string
          email?: string | null
          is_primary?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          hosted_table_id: string
          primary_traveler_id: string
          referral_attribution_id: string | null
          party_size: number
          party_type: string
          status: Database['public']['Enums']['booking_status']
          compatibility_status: Database['public']['Enums']['compatibility_status']
          payment_status: Database['public']['Enums']['payment_status']
          refund_status: string
          host_net_payout_kurus: number
          sofra_gross_fee_kurus: number
          partner_commission_kurus: number
          guest_total_kurus: number
          take_rate_basis_points: number
          currency: string
          policy_snapshot: Json
          table_policy_acknowledged_at: string | null
          compatibility_acknowledged_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
          refund_due_kurus: number
          host_compensation_kurus: number
        }
        Insert: {
          id?: string
          hosted_table_id: string
          primary_traveler_id: string
          referral_attribution_id?: string | null
          party_size: number
          party_type: string
          status?: Database['public']['Enums']['booking_status']
          compatibility_status?: Database['public']['Enums']['compatibility_status']
          payment_status?: Database['public']['Enums']['payment_status']
          refund_status?: string
          host_net_payout_kurus: number
          sofra_gross_fee_kurus: number
          partner_commission_kurus?: number
          guest_total_kurus: number
          take_rate_basis_points: number
          currency?: string
          policy_snapshot: Json
          table_policy_acknowledged_at?: string | null
          compatibility_acknowledged_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
          refund_due_kurus?: number
          host_compensation_kurus?: number
        }
        Update: {
          id?: string
          hosted_table_id?: string
          primary_traveler_id?: string
          referral_attribution_id?: string | null
          party_size?: number
          party_type?: string
          status?: Database['public']['Enums']['booking_status']
          compatibility_status?: Database['public']['Enums']['compatibility_status']
          payment_status?: Database['public']['Enums']['payment_status']
          refund_status?: string
          host_net_payout_kurus?: number
          sofra_gross_fee_kurus?: number
          partner_commission_kurus?: number
          guest_total_kurus?: number
          take_rate_basis_points?: number
          currency?: string
          policy_snapshot?: Json
          table_policy_acknowledged_at?: string | null
          compatibility_acknowledged_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
          refund_due_kurus?: number
          host_compensation_kurus?: number
        }
      }
      dietary_compatibility_decisions: {
        Row: {
          id: string
          booking_id: string
          status: Database['public']['Enums']['compatibility_status']
          reviewer_profile_id: string
          private_reason: string | null
          decided_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          status: Database['public']['Enums']['compatibility_status']
          reviewer_profile_id: string
          private_reason?: string | null
          decided_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          status?: Database['public']['Enums']['compatibility_status']
          reviewer_profile_id?: string
          private_reason?: string | null
          decided_at?: string
        }
      }
      dietary_disclosures: {
        Row: {
          id: string
          booking_id: string
          booking_guest_id: string | null
          kind: Database['public']['Enums']['dietary_kind']
          importance: string
          explanation: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          booking_guest_id?: string | null
          kind: Database['public']['Enums']['dietary_kind']
          importance: string
          explanation: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          booking_guest_id?: string | null
          kind?: Database['public']['Enums']['dietary_kind']
          importance?: string
          explanation?: string
          created_at?: string
          updated_at?: string
        }
      }
      host_applications: {
        Row: {
          id: string
          applicant_profile_id: string
          household_id: string | null
          status: Database['public']['Enums']['application_status']
          motivation: string
          hosting_plan: string
          submitted_at: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
          applicant_neighborhood: string | null
        }
        Insert: {
          id?: string
          applicant_profile_id: string
          household_id?: string | null
          status?: Database['public']['Enums']['application_status']
          motivation?: string
          hosting_plan?: string
          submitted_at?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
          applicant_neighborhood?: string | null
        }
        Update: {
          id?: string
          applicant_profile_id?: string
          household_id?: string | null
          status?: Database['public']['Enums']['application_status']
          motivation?: string
          hosting_plan?: string
          submitted_at?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
          applicant_neighborhood?: string | null
        }
      }
      host_assessments: {
        Row: {
          id: string
          host_application_id: string
          assessor_profile_id: string
          private_notes: string
          recommended_capacity: number | null
          recommendation: string
          assessed_at: string
        }
        Insert: {
          id?: string
          host_application_id: string
          assessor_profile_id: string
          private_notes: string
          recommended_capacity?: number | null
          recommendation: string
          assessed_at?: string
        }
        Update: {
          id?: string
          host_application_id?: string
          assessor_profile_id?: string
          private_notes?: string
          recommended_capacity?: number | null
          recommendation?: string
          assessed_at?: string
        }
      }
      host_certifications: {
        Row: {
          id: string
          household_id: string
          lead_host_profile_id: string
          status: Database['public']['Enums']['certification_status']
          certified_traveler_capacity: number
          valid_from: string | null
          valid_until: string | null
          certified_by: string | null
          suspension_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          lead_host_profile_id: string
          status?: Database['public']['Enums']['certification_status']
          certified_traveler_capacity: number
          valid_from?: string | null
          valid_until?: string | null
          certified_by?: string | null
          suspension_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          lead_host_profile_id?: string
          status?: Database['public']['Enums']['certification_status']
          certified_traveler_capacity?: number
          valid_from?: string | null
          valid_until?: string | null
          certified_by?: string | null
          suspension_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hosted_table_translations: {
        Row: {
          id: string
          hosted_table_id: string
          locale: string
          menu_title: string
          menu_description: string
          household_story: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          hosted_table_id: string
          locale: string
          menu_title: string
          menu_description: string
          household_story?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          hosted_table_id?: string
          locale?: string
          menu_title?: string
          menu_description?: string
          household_story?: string | null
          approved_by?: string | null
          approved_at?: string | null
        }
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
          format: Database['public']['Enums']['table_format']
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
          currency: string
          booking_cutoff_at: string
          roster_lock_at: string
          status: Database['public']['Enums']['hosted_table_status']
          published_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          household_id: string
          lead_verified_host_id: string
          private_address_id: string
          pricing_policy_id: string
          starts_at: string
          timezone?: string
          public_neighborhood: string
          public_approximate_latitude?: number | null
          public_approximate_longitude?: number | null
          format: Database['public']['Enums']['table_format']
          menu_title: string
          menu_description: string
          atmosphere: string
          languages?: string[]
          expected_household_participants: string
          practical_information: string
          accessibility_information: string
          proposed_capacity: number
          certified_capacity: number
          available_seats: number
          minimum_guest_count: number
          guaranteed_operation?: boolean
          host_net_payout_kurus: number
          guest_price_kurus: number
          currency?: string
          booking_cutoff_at: string
          roster_lock_at: string
          status?: Database['public']['Enums']['hosted_table_status']
          published_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          household_id?: string
          lead_verified_host_id?: string
          private_address_id?: string
          pricing_policy_id?: string
          starts_at?: string
          timezone?: string
          public_neighborhood?: string
          public_approximate_latitude?: number | null
          public_approximate_longitude?: number | null
          format?: Database['public']['Enums']['table_format']
          menu_title?: string
          menu_description?: string
          atmosphere?: string
          languages?: string[]
          expected_household_participants?: string
          practical_information?: string
          accessibility_information?: string
          proposed_capacity?: number
          certified_capacity?: number
          available_seats?: number
          minimum_guest_count?: number
          guaranteed_operation?: boolean
          host_net_payout_kurus?: number
          guest_price_kurus?: number
          currency?: string
          booking_cutoff_at?: string
          roster_lock_at?: string
          status?: Database['public']['Enums']['hosted_table_status']
          published_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          profile_id: string | null
          display_name: string
          relationship_description: string
          is_adult: boolean
          is_verified_host: boolean
          participates_in_dinners: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          profile_id?: string | null
          display_name: string
          relationship_description: string
          is_adult: boolean
          is_verified_host?: boolean
          participates_in_dinners?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          profile_id?: string | null
          display_name?: string
          relationship_description?: string
          is_adult?: boolean
          is_verified_host?: boolean
          participates_in_dinners?: boolean
          created_at?: string
        }
      }
      household_private_addresses: {
        Row: {
          id: string
          household_id: string
          address_line_1: string
          address_line_2: string | null
          district: string
          city: string
          postal_code: string | null
          precise_latitude: number | null
          precise_longitude: number | null
          verification_notes: string | null
          arrival_instructions: string | null
          verified_at: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          address_line_1: string
          address_line_2?: string | null
          district: string
          city: string
          postal_code?: string | null
          precise_latitude?: number | null
          precise_longitude?: number | null
          verification_notes?: string | null
          arrival_instructions?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          address_line_1?: string
          address_line_2?: string | null
          district?: string
          city?: string
          postal_code?: string | null
          precise_latitude?: number | null
          precise_longitude?: number | null
          verification_notes?: string | null
          arrival_instructions?: string | null
          verified_at?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      households: {
        Row: {
          id: string
          owner_profile_id: string
          public_name: string
          public_story: string
          household_structure: string
          atmosphere: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_profile_id: string
          public_name: string
          public_story: string
          household_structure: string
          atmosphere?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_profile_id?: string
          public_name?: string
          public_story?: string
          household_structure?: string
          atmosphere?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      partner_organizations: {
        Row: {
          id: string
          name: string
          code: string
          status: string
          commission_basis_points: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          status?: string
          commission_basis_points?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          status?: string
          commission_basis_points?: number
          created_at?: string
        }
      }
      partner_users: {
        Row: {
          id: string
          partner_organization_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          partner_organization_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          partner_organization_id?: string
          profile_id?: string
          created_at?: string
        }
      }
      payment_records: {
        Row: {
          id: string
          booking_id: string
          provider_code: string
          provider_reference: string
          amount_kurus: number
          currency: string
          status: Database['public']['Enums']['payment_status']
          is_simulated: boolean
          raw_event_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          provider_code: string
          provider_reference: string
          amount_kurus: number
          currency?: string
          status: Database['public']['Enums']['payment_status']
          is_simulated?: boolean
          raw_event_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          provider_code?: string
          provider_reference?: string
          amount_kurus?: number
          currency?: string
          status?: Database['public']['Enums']['payment_status']
          is_simulated?: boolean
          raw_event_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payout_records: {
        Row: {
          id: string
          hosted_table_id: string
          household_id: string
          amount_kurus: number
          currency: string
          status: Database['public']['Enums']['payout_status']
          hold_reason: string | null
          released_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hosted_table_id: string
          household_id: string
          amount_kurus: number
          currency?: string
          status?: Database['public']['Enums']['payout_status']
          hold_reason?: string | null
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hosted_table_id?: string
          household_id?: string
          amount_kurus?: number
          currency?: string
          status?: Database['public']['Enums']['payout_status']
          hold_reason?: string | null
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pricing_policies: {
        Row: {
          id: string
          name: string
          currency: string
          take_rate_basis_points: number
          minimum_lead_days: number
          maximum_horizon_days: number
          booking_cutoff_hours: number
          roster_lock_hours: number
          shared_minimum_travelers: number
          maximum_shared_party_size: number
          new_host_active_table_limit: number
          new_host_weekly_dinner_limit: number
          active_from: string
          active_until: string | null
          created_by: string | null
          created_at: string
          refund_before_cutoff_basis_points: number
          refund_after_cutoff_basis_points: number
        }
        Insert: {
          id?: string
          name: string
          currency?: string
          take_rate_basis_points: number
          minimum_lead_days: number
          maximum_horizon_days: number
          booking_cutoff_hours: number
          roster_lock_hours: number
          shared_minimum_travelers: number
          maximum_shared_party_size: number
          new_host_active_table_limit: number
          new_host_weekly_dinner_limit: number
          active_from: string
          active_until?: string | null
          created_by?: string | null
          created_at?: string
          refund_before_cutoff_basis_points?: number
          refund_after_cutoff_basis_points?: number
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          take_rate_basis_points?: number
          minimum_lead_days?: number
          maximum_horizon_days?: number
          booking_cutoff_hours?: number
          roster_lock_hours?: number
          shared_minimum_travelers?: number
          maximum_shared_party_size?: number
          new_host_active_table_limit?: number
          new_host_weekly_dinner_limit?: number
          active_from?: string
          active_until?: string | null
          created_by?: string | null
          created_at?: string
          refund_before_cutoff_basis_points?: number
          refund_after_cutoff_basis_points?: number
        }
      }
      private_constructive_feedback: {
        Row: {
          id: string
          booking_id: string
          author_profile_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          author_profile_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          author_profile_id?: string
          body?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          auth_user_id: string | null
          display_name: string
          preferred_locale: string
          phone_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          display_name: string
          preferred_locale?: string
          phone_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          display_name?: string
          preferred_locale?: string
          phone_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      public_experience_reviews: {
        Row: {
          id: string
          booking_id: string
          author_profile_id: string
          hosted_table_id: string
          body: string
          published_at: string | null
          created_at: string
          rating: number | null
          title: string | null
          rejected_at: string | null
          moderated_by: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          author_profile_id: string
          hosted_table_id: string
          body: string
          published_at?: string | null
          created_at?: string
          rating?: number | null
          title?: string | null
          rejected_at?: string | null
          moderated_by?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          author_profile_id?: string
          hosted_table_id?: string
          body?: string
          published_at?: string | null
          created_at?: string
          rating?: number | null
          title?: string | null
          rejected_at?: string | null
          moderated_by?: string | null
        }
      }
      referral_attributions: {
        Row: {
          id: string
          partner_organization_id: string
          referral_code: string
          landing_at: string
          attributed_profile_id: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          partner_organization_id: string
          referral_code: string
          landing_at?: string
          attributed_profile_id?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          partner_organization_id?: string
          referral_code?: string
          landing_at?: string
          attributed_profile_id?: string | null
          metadata?: Json
        }
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
          id?: string
          profile_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string
          revoked_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          role_id?: string
          assigned_by?: string | null
          assigned_at?: string
          revoked_at?: string | null
        }
      }
      roles: {
        Row: {
          id: string
          code: Database['public']['Enums']['application_role']
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          code: Database['public']['Enums']['application_role']
          description: string
          created_at?: string
        }
        Update: {
          id?: string
          code?: Database['public']['Enums']['application_role']
          description?: string
          created_at?: string
        }
      }
      safety_incidents: {
        Row: {
          id: string
          booking_id: string | null
          hosted_table_id: string | null
          reporter_profile_id: string
          status: Database['public']['Enums']['incident_status']
          severity: string
          confidential_report: string
          assigned_to: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          hosted_table_id?: string | null
          reporter_profile_id: string
          status?: Database['public']['Enums']['incident_status']
          severity: string
          confidential_report: string
          assigned_to?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          hosted_table_id?: string | null
          reporter_profile_id?: string
          status?: Database['public']['Enums']['incident_status']
          severity?: string
          confidential_report?: string
          assigned_to?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
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
          format: Database['public']['Enums']['table_format'] | null
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
          currency: string | null
          booking_cutoff_at: string | null
          status: Database['public']['Enums']['hosted_table_status'] | null
        }
      }
    }
    Functions: {
      assert_completed_booking_owner: {
        Args: {
          p_profile_id: string
          p_booking_id: string
        }
        Returns: unknown
      }
      assert_operator: {
        Args: {
          p_profile_id: string
        }
        Returns: unknown
      }
      cancel_booking: {
        Args: {
          p_profile_id: string
          p_booking_id: string
          p_reason: string
        }
        Returns: unknown
      }
      cancel_published_table: {
        Args: {
          p_operator_id: string
          p_table_id: string
          p_reason: string
        }
        Returns: {
          table_id: string | null
          bookings_cancelled: number | null
          refund_due_total_kurus: string | null
          payouts_held: number | null
        }[]
      }
      create_booking: {
        Args: {
          p_profile_id: string
          p_table_id: string
          p_party_size: number
          p_party_type: string
          p_policy_snapshot: Json
          p_primary_guest_name: string
          p_primary_guest_email: string
          p_additional_guest_names: string[]
          p_dietary_disclosure: string
          p_referral_attribution_id: string
        }
        Returns: unknown
      }
      create_hosted_table_draft: {
        Args: {
          p_profile_id: string
          p_menu_title: string
          p_menu_description: string
          p_starts_at: string
          p_format: Database['public']['Enums']['table_format']
          p_proposed_capacity: number
          p_minimum_guest_count: number
          p_host_net_payout_kurus: number
          p_atmosphere: string
          p_expected_household_participants: string
          p_practical_information: string
          p_accessibility_information: string
        }
        Returns: unknown
      }
      decide_dietary_compatibility: {
        Args: {
          p_operator_id: string
          p_booking_id: string
          p_decision: string
          p_private_reason: string
        }
        Returns: unknown
      }
      decide_host_application: {
        Args: {
          p_operator_id: string
          p_application_id: string
          p_decision: string
          p_reason: string
          p_certified_capacity: number
        }
        Returns: unknown
      }
      get_booking_summaries: {
        Args: {
          p_profile_id: string
        }
        Returns: {
          id: string | null
          table_id: string | null
          table_slug: string | null
          menu_title: string | null
          household_name: string | null
          starts_at: string | null
          public_neighborhood: string | null
          party_size: number | null
          party_type: string | null
          status: Database['public']['Enums']['booking_status'] | null
          compatibility_status: Database['public']['Enums']['compatibility_status'] | null
          payment_status: Database['public']['Enums']['payment_status'] | null
          guest_total_kurus: number | null
        }[]
      }
      get_host_roster: {
        Args: {
          p_table_id: string
          p_profile_id: string
        }
        Returns: {
          id: string | null
          table_id: string | null
          party_size: number | null
          status: Database['public']['Enums']['booking_status'] | null
          compatibility_status: Database['public']['Enums']['compatibility_status'] | null
        }[]
      }
      get_partner_referral_summary: {
        Args: {
          p_profile_id: string
        }
        Returns: {
          organization_id: string | null
          organization_name: string | null
          organization_code: string | null
          organization_status: string | null
          attribution_id: string | null
          referral_code: string | null
          landed_at: string | null
          booking_id: string | null
          booking_status: Database['public']['Enums']['booking_status'] | null
          party_size: number | null
          table_slug: string | null
          menu_title: string | null
          starts_at: string | null
          public_neighborhood: string | null
        }[]
      }
      hold_payout: {
        Args: {
          p_operator_id: string
          p_payout_id: string
          p_hold_reason: string
        }
        Returns: unknown
      }
      moderate_public_review: {
        Args: {
          p_operator_id: string
          p_review_id: string
          p_decision: string
          p_reason: string
        }
        Returns: unknown
      }
      profile_has_role: {
        Args: {
          p_profile_id: string
          p_role: Database['public']['Enums']['application_role']
        }
        Returns: unknown
      }
      publish_hosted_table: {
        Args: {
          p_operator_id: string
          p_table_id: string
        }
        Returns: unknown
      }
      release_payout: {
        Args: {
          p_operator_id: string
          p_payout_id: string
          p_reason: string
        }
        Returns: unknown
      }
      report_safety_incident: {
        Args: {
          p_profile_id: string
          p_booking_id: string
          p_severity: string
          p_confidential_report: string
        }
        Returns: unknown
      }
      review_hosted_table: {
        Args: {
          p_operator_id: string
          p_table_id: string
          p_decision: string
          p_reason: string
        }
        Returns: unknown
      }
      slugify: {
        Args: {
          p_value: string
        }
        Returns: string
      }
      submit_host_address: {
        Args: {
          p_profile_id: string
          p_address_line_1: string
          p_address_line_2: string
          p_district: string
          p_city: string
          p_postal_code: string
          p_arrival_instructions: string
        }
        Returns: unknown
      }
      submit_host_application: {
        Args: {
          p_profile_id: string
          p_household_name: string
          p_neighborhood: string
          p_story: string
          p_motivation: string
          p_participation: string
        }
        Returns: unknown
      }
      submit_hosted_table: {
        Args: {
          p_profile_id: string
          p_table_id: string
        }
        Returns: unknown
      }
      submit_private_feedback: {
        Args: {
          p_profile_id: string
          p_booking_id: string
          p_body: string
        }
        Returns: unknown
      }
      submit_public_review: {
        Args: {
          p_profile_id: string
          p_booking_id: string
          p_rating: number
          p_title: string
          p_body: string
        }
        Returns: unknown
      }
      triage_incident: {
        Args: {
          p_operator_id: string
          p_incident_id: string
          p_status: Database['public']['Enums']['incident_status']
          p_reason: string
        }
        Returns: unknown
      }
    }
    Enums: {
      application_role: ApplicationRole
      application_status: ApplicationStatus
      booking_status: BookingStatus
      certification_status: CertificationStatus
      compatibility_status: CompatibilityStatus
      dietary_kind: DietaryKind
      hosted_table_status: HostedTableStatus
      incident_status: IncidentStatus
      payment_status: PaymentStatus
      payout_status: PayoutStatus
      table_format: TableFormat
    }
  }
}
