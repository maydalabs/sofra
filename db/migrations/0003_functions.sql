-- Triggers, the public projection, and purposeful read models.
--
-- These functions are NOT security definer. Under Supabase they escalated
-- privilege past row-level security; here the application connects as a single
-- role and no database connection is ever exposed to a browser. Their real
-- value was always the explicit column allowlist -- deciding what a caller is
-- permitted to see -- and that is preserved exactly.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
--
-- Review finding #7: every updated_at column was declared `default now()` with
-- no trigger, so all of them permanently equalled created_at.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach to every table that has an updated_at column, so a table added later
-- cannot silently miss it. Better Auth's tables use "updatedAt" and are
-- deliberately not matched -- Better Auth maintains those itself.
do $$
declare
  target record;
begin
  for target in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      target.table_name
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role helper
--
-- Portable replacement for Supabase's has_role(), which depended on auth.uid().
-- The actor is now always an explicit parameter.
-- ---------------------------------------------------------------------------

create or replace function public.profile_has_role(
  p_profile_id uuid,
  p_role public.application_role
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.role_assignments ra
    join public.roles r on r.id = ra.role_id
    where ra.profile_id = p_profile_id
      and ra.revoked_at is null
      and r.code = p_role
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile bootstrap
--
-- Review finding #1: nothing created a profile row, and profiles had no INSERT
-- policy, so a real signup produced an auth user who could do nothing at all.
-- Every new Better Auth user now gets a profile and the baseline traveler role
-- in the same transaction as the signup.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
as $$
declare
  new_profile_id uuid;
  derived_name text;
begin
  derived_name := coalesce(nullif(btrim(new."name"), ''), split_part(new.email, '@', 1));
  derived_name := left(coalesce(nullif(derived_name, ''), 'Sofra guest'), 100);

  insert into public.profiles (auth_user_id, display_name)
  values (new.id, derived_name)
  returning id into new_profile_id;

  insert into public.role_assignments (profile_id, role_id)
  select new_profile_id, r.id
  from public.roles r
  where r.code = 'traveler';

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on public."user"
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Anonymous-safe public projection
-- ---------------------------------------------------------------------------

create view public.published_hosted_tables as
select
  ht.id,
  ht.slug,
  h.public_name as household_name,
  h.public_story as household_story,
  h.household_structure,
  p.display_name as lead_host_name,
  ht.starts_at,
  ht.timezone,
  ht.public_neighborhood,
  ht.public_approximate_latitude,
  ht.public_approximate_longitude,
  ht.format,
  ht.menu_title,
  ht.menu_description,
  ht.atmosphere,
  ht.languages,
  ht.expected_household_participants,
  ht.practical_information,
  ht.accessibility_information,
  ht.certified_capacity,
  ht.available_seats,
  ht.minimum_guest_count,
  ht.guaranteed_operation,
  ht.guest_price_kurus,
  ht.currency,
  ht.booking_cutoff_at,
  ht.status
from public.hosted_tables ht
join public.households h on h.id = ht.household_id
join public.profiles p on p.id = ht.lead_verified_host_id
where ht.status in ('published', 'minimum_reached', 'confirmed', 'roster_locked')
  and ht.published_at is not null;

comment on view public.published_hosted_tables is
  'Anonymous-safe allowlist. Exact addresses, private coordinates, arrival instructions, guest identities, and dietary data are intentionally absent.';

-- ---------------------------------------------------------------------------
-- Traveler-owned booking read model
-- ---------------------------------------------------------------------------

create or replace function public.get_booking_summaries(p_profile_id uuid)
returns table (
  id uuid,
  table_id uuid,
  table_slug text,
  menu_title text,
  household_name text,
  starts_at timestamptz,
  public_neighborhood text,
  party_size integer,
  party_type text,
  status public.booking_status,
  compatibility_status public.compatibility_status,
  payment_status public.payment_status,
  guest_total_kurus integer
)
language sql
stable
as $$
  select
    b.id,
    ht.id as table_id,
    ht.slug as table_slug,
    ht.menu_title,
    h.public_name as household_name,
    ht.starts_at,
    ht.public_neighborhood,
    b.party_size,
    b.party_type,
    b.status,
    b.compatibility_status,
    b.payment_status,
    b.guest_total_kurus
  from public.bookings b
  join public.hosted_tables ht on ht.id = b.hosted_table_id
  join public.households h on h.id = ht.household_id
  where b.primary_traveler_id = p_profile_id
  order by ht.starts_at desc;
$$;

comment on function public.get_booking_summaries(uuid) is
  'Traveler-owned booking read model. Excludes exact address, arrival instructions, guest names, dietary disclosure text, and internal records.';

-- ---------------------------------------------------------------------------
-- Serving-host roster read model
-- ---------------------------------------------------------------------------

create or replace function public.get_host_roster(
  p_table_id uuid,
  p_profile_id uuid
)
returns table (
  id uuid,
  table_id uuid,
  party_size integer,
  status public.booking_status,
  compatibility_status public.compatibility_status
)
language sql
stable
as $$
  select
    b.id,
    b.hosted_table_id as table_id,
    b.party_size,
    b.status,
    b.compatibility_status
  from public.bookings b
  join public.hosted_tables ht on ht.id = b.hosted_table_id
  join public.households h on h.id = ht.household_id
  where b.hosted_table_id = p_table_id
    and h.owner_profile_id = p_profile_id
    and b.status in ('confirmed', 'completed')
  order by b.created_at;
$$;

comment on function public.get_host_roster(uuid, uuid) is
  'Serving-host roster read model. Returns only party size, lifecycle, and compatibility status for bookings owned by the caller''s household. Excludes guest names, dietary text, addresses, payment detail, and internal records.';

-- ---------------------------------------------------------------------------
-- Partner referral read model
-- ---------------------------------------------------------------------------

create or replace function public.get_partner_referral_summary(p_profile_id uuid)
returns table (
  organization_id uuid,
  organization_name text,
  organization_code text,
  organization_status text,
  attribution_id uuid,
  referral_code text,
  landed_at timestamptz,
  booking_id uuid,
  booking_status public.booking_status,
  party_size integer,
  table_slug text,
  menu_title text,
  starts_at timestamptz,
  public_neighborhood text
)
language sql
stable
as $$
  select
    po.id as organization_id,
    po.name as organization_name,
    po.code as organization_code,
    po.status as organization_status,
    ra.id as attribution_id,
    ra.referral_code,
    ra.landing_at as landed_at,
    b.id as booking_id,
    b.status as booking_status,
    b.party_size,
    ht.slug as table_slug,
    ht.menu_title,
    ht.starts_at,
    ht.public_neighborhood
  from public.partner_users pu
  join public.partner_organizations po
    on po.id = pu.partner_organization_id
  left join public.referral_attributions ra
    on ra.partner_organization_id = po.id
  left join public.bookings b
    on b.referral_attribution_id = ra.id
  left join public.hosted_tables ht
    on ht.id = b.hosted_table_id
  where pu.profile_id = p_profile_id
    and public.profile_has_role(p_profile_id, 'partner_user'::public.application_role)
  order by po.name, ra.landing_at desc nulls last, b.created_at desc nulls last;
$$;

comment on function public.get_partner_referral_summary(uuid) is
  'Partner-owned referral projection. Returns organization identity, referral stage, party count, and public table context only. Traveler identity, attribution metadata, private location, dietary data, payment detail, commissions, and settlement data are excluded.';
