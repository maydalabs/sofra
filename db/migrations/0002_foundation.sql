-- Sofra foundation schema. Portable PostgreSQL 17 -- no vendor-specific
-- schemas, roles, or helper functions.
--
-- gen_random_uuid() is core in PostgreSQL 13+, so pgcrypto is not required.
--
-- Authorization is enforced in the server layer (see src/server/repositories),
-- not by row-level security. Application code connects as a single database
-- role and never exposes a database connection to a browser.

create type public.application_role as enum (
  'traveler', 'host_applicant', 'certified_host', 'partner_user', 'operator', 'administrator'
);
create type public.application_status as enum (
  'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'declined', 'withdrawn'
);
create type public.certification_status as enum ('pending', 'active', 'suspended', 'expired', 'revoked');
create type public.hosted_table_status as enum (
  'draft', 'submitted', 'changes_requested', 'approved', 'published', 'minimum_reached',
  'confirmed', 'roster_locked', 'completed', 'cancelled', 'archived'
);
create type public.table_format as enum ('shared', 'private');
create type public.booking_status as enum (
  'draft', 'awaiting_payment', 'payment_authorized', 'pending_minimum', 'confirmed',
  'cancelled', 'refunded', 'completed', 'disputed'
);
create type public.compatibility_status as enum ('not_required', 'pending', 'accepted', 'declined');
create type public.dietary_kind as enum (
  'allergy', 'intolerance', 'dietary_restriction', 'religious_food_restriction', 'preference'
);
create type public.payment_status as enum ('not_started', 'created', 'authorized', 'failed', 'refunded', 'held');
create type public.payout_status as enum ('pending', 'eligible', 'held', 'released');
create type public.incident_status as enum ('open', 'triaged', 'investigating', 'resolved', 'closed');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text unique references public."user"(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'tr')),
  phone_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code public.application_role not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (profile_id, role_id)
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id),
  public_name text not null,
  public_story text not null,
  household_structure text not null,
  atmosphere text,
  status text not null default 'applicant' check (status in ('applicant', 'certified', 'suspended', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_private_addresses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  address_line_1 text not null,
  address_line_2 text,
  district text not null,
  city text not null,
  postal_code text,
  precise_latitude numeric(9, 6),
  precise_longitude numeric(9, 6),
  verification_notes text,
  arrival_instructions text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  display_name text not null,
  relationship_description text not null,
  is_adult boolean not null,
  is_verified_host boolean not null default false,
  participates_in_dinners boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.host_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_profile_id uuid not null references public.profiles(id),
  household_id uuid references public.households(id),
  status public.application_status not null default 'draft',
  motivation text not null default '',
  hosting_plan text not null default '',
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.host_assessments (
  id uuid primary key default gen_random_uuid(),
  host_application_id uuid not null references public.host_applications(id) on delete cascade,
  assessor_profile_id uuid not null references public.profiles(id),
  private_notes text not null,
  recommended_capacity integer check (recommended_capacity between 1 and 12),
  recommendation text not null check (recommendation in ('approve', 'changes_requested', 'decline')),
  assessed_at timestamptz not null default now()
);

create table public.host_certifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id),
  lead_host_profile_id uuid not null references public.profiles(id),
  status public.certification_status not null default 'pending',
  certified_traveler_capacity integer not null check (certified_traveler_capacity between 1 and 12),
  valid_from timestamptz,
  valid_until timestamptz,
  certified_by uuid references public.profiles(id),
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pricing_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'TRY' check (currency = 'TRY'),
  take_rate_basis_points integer not null check (take_rate_basis_points between 0 and 9999),
  minimum_lead_days integer not null,
  maximum_horizon_days integer not null,
  booking_cutoff_hours integer not null,
  roster_lock_hours integer not null,
  shared_minimum_travelers integer not null,
  maximum_shared_party_size integer not null,
  new_host_active_table_limit integer not null,
  new_host_weekly_dinner_limit integer not null,
  active_from timestamptz not null,
  active_until timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.hosted_tables (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  household_id uuid not null references public.households(id),
  lead_verified_host_id uuid not null references public.profiles(id),
  private_address_id uuid not null references public.household_private_addresses(id),
  pricing_policy_id uuid not null references public.pricing_policies(id),
  starts_at timestamptz not null,
  timezone text not null default 'Europe/Istanbul',
  public_neighborhood text not null,
  public_approximate_latitude numeric(8, 5),
  public_approximate_longitude numeric(8, 5),
  format public.table_format not null,
  menu_title text not null,
  menu_description text not null,
  atmosphere text not null,
  languages text[] not null default '{}',
  expected_household_participants text not null,
  practical_information text not null,
  accessibility_information text not null,
  proposed_capacity integer not null check (proposed_capacity between 1 and 12),
  certified_capacity integer not null check (certified_capacity between 1 and 12),
  available_seats integer not null check (available_seats >= 0),
  minimum_guest_count integer not null check (minimum_guest_count >= 1),
  guaranteed_operation boolean not null default false,
  host_net_payout_kurus integer not null check (host_net_payout_kurus >= 0),
  guest_price_kurus integer not null check (guest_price_kurus >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  booking_cutoff_at timestamptz not null,
  roster_lock_at timestamptz not null,
  status public.hosted_table_status not null default 'draft',
  published_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hosted_table_capacity_valid check (
    proposed_capacity <= certified_capacity and available_seats <= certified_capacity
  ),
  constraint hosted_table_windows_valid check (
    booking_cutoff_at < roster_lock_at and roster_lock_at < starts_at
  )
);

create table public.hosted_table_translations (
  id uuid primary key default gen_random_uuid(),
  hosted_table_id uuid not null references public.hosted_tables(id) on delete cascade,
  locale text not null check (locale in ('en', 'tr')),
  menu_title text not null,
  menu_description text not null,
  household_story text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  unique (hosted_table_id, locale)
);

create table public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  commission_basis_points integer not null default 0 check (commission_basis_points between 0 and 9999),
  created_at timestamptz not null default now()
);

create table public.partner_users (
  id uuid primary key default gen_random_uuid(),
  partner_organization_id uuid not null references public.partner_organizations(id),
  profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (partner_organization_id, profile_id)
);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  partner_organization_id uuid not null references public.partner_organizations(id),
  referral_code text not null,
  landing_at timestamptz not null default now(),
  attributed_profile_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  hosted_table_id uuid not null references public.hosted_tables(id),
  primary_traveler_id uuid not null references public.profiles(id),
  referral_attribution_id uuid references public.referral_attributions(id),
  party_size integer not null check (party_size between 1 and 12),
  party_type text not null check (party_type in ('solo', 'couple', 'family', 'friends', 'colleagues', 'other')),
  status public.booking_status not null default 'draft',
  compatibility_status public.compatibility_status not null default 'not_required',
  payment_status public.payment_status not null default 'not_started',
  refund_status text not null default 'not_requested' check (
    refund_status in ('not_requested', 'requested', 'processing', 'completed', 'declined')
  ),
  host_net_payout_kurus integer not null check (host_net_payout_kurus >= 0),
  sofra_gross_fee_kurus integer not null check (sofra_gross_fee_kurus >= 0),
  partner_commission_kurus integer not null default 0 check (partner_commission_kurus >= 0),
  guest_total_kurus integer not null check (guest_total_kurus >= 0),
  take_rate_basis_points integer not null check (take_rate_basis_points between 0 and 9999),
  currency text not null default 'TRY' check (currency = 'TRY'),
  policy_snapshot jsonb not null,
  table_policy_acknowledged_at timestamptz,
  compatibility_acknowledged_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_money_balances check (
    guest_total_kurus = host_net_payout_kurus + sofra_gross_fee_kurus
  ),
  constraint booking_commission_within_fee check (
    partner_commission_kurus <= sofra_gross_fee_kurus
  )
);

create table public.booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  full_name text not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.dietary_disclosures (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_guest_id uuid references public.booking_guests(id) on delete cascade,
  kind public.dietary_kind not null,
  importance text not null check (importance in ('low', 'important', 'severe')),
  explanation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dietary_compatibility_decisions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  status public.compatibility_status not null,
  reviewer_profile_id uuid not null references public.profiles(id),
  private_reason text,
  decided_at timestamptz not null default now()
);

create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  provider_code text not null,
  provider_reference text not null unique,
  amount_kurus integer not null check (amount_kurus >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status public.payment_status not null,
  is_simulated boolean not null default false,
  raw_event_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payout_records (
  id uuid primary key default gen_random_uuid(),
  hosted_table_id uuid not null references public.hosted_tables(id),
  household_id uuid not null references public.households(id),
  amount_kurus integer not null check (amount_kurus >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status public.payout_status not null default 'pending',
  hold_reason text,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.public_experience_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  author_profile_id uuid not null references public.profiles(id),
  hosted_table_id uuid not null references public.hosted_tables(id),
  body text not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.private_constructive_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  author_profile_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  hosted_table_id uuid references public.hosted_tables(id),
  reporter_profile_id uuid not null references public.profiles(id),
  status public.incident_status not null default 'open',
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  confidential_report text not null,
  assigned_to uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrative_notes (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid not null references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  reason text,
  previous_state jsonb,
  new_state jsonb,
  occurred_at timestamptz not null default now()
);

create index hosted_tables_public_discovery_idx
  on public.hosted_tables (status, starts_at) where status in ('published', 'minimum_reached', 'confirmed');
create index bookings_primary_traveler_idx on public.bookings (primary_traveler_id, created_at desc);
create index bookings_hosted_table_idx on public.bookings (hosted_table_id, status);
create index dietary_disclosures_booking_idx on public.dietary_disclosures (booking_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, occurred_at desc);
create index incidents_status_idx on public.safety_incidents (status, created_at desc);
