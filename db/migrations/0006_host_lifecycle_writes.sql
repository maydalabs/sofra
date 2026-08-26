-- Host lifecycle writes: apply, create a draft table, submit it for review.
--
-- Same shape as the booking writes: the rule is enforced here, in the same
-- transaction as the audit row, so a caller that bypasses the repository still
-- cannot skip a lifecycle guard or invent a price.

-- The application form asks which neighbourhood the household is in, but there
-- was nowhere to put it. A household has no neighbourhood of its own -- only a
-- private address, which does not exist yet at application time.
alter table public.host_applications
  add column if not exists applicant_neighborhood text;

-- ---------------------------------------------------------------------------
-- Slug generation
-- ---------------------------------------------------------------------------

create or replace function public.slugify(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    both '-' from
    regexp_replace(
      lower(translate(p_value, 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

comment on function public.slugify(text) is
  'URL-safe slug with Turkish characters transliterated rather than stripped.';

-- ---------------------------------------------------------------------------
-- Host application
--
-- Creates the applicant household and the submitted application together, and
-- grants the host_applicant role. Roles are never self-assigned from the client;
-- this is the server-controlled assignment that AGENTS.md requires.
-- ---------------------------------------------------------------------------

create or replace function public.submit_host_application(
  p_profile_id uuid,
  p_household_name text,
  p_neighborhood text,
  p_story text,
  p_motivation text,
  p_participation text
)
returns public.host_applications
language plpgsql
as $$
declare
  v_household public.households;
  v_application public.host_applications;
begin
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'profile not found' using errcode = 'SF001';
  end if;

  -- One open application at a time.
  if exists (
    select 1 from public.host_applications
    where applicant_profile_id = p_profile_id
      and status in ('submitted', 'under_review', 'changes_requested', 'approved')
  ) then
    raise exception 'an application is already in progress' using errcode = 'SF010';
  end if;

  insert into public.households (
    owner_profile_id, public_name, public_story, household_structure, status
  ) values (
    p_profile_id, p_household_name, p_story, p_participation, 'applicant'
  )
  returning * into v_household;

  insert into public.host_applications (
    applicant_profile_id, household_id, status, motivation, hosting_plan,
    applicant_neighborhood, submitted_at
  ) values (
    p_profile_id, v_household.id, 'submitted', p_motivation, p_participation,
    p_neighborhood, now()
  )
  returning * into v_application;

  insert into public.role_assignments (profile_id, role_id)
  select p_profile_id, r.id from public.roles r where r.code = 'host_applicant'
  on conflict (profile_id, role_id) do nothing;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'host_application.submitted', 'host_application',
    v_application.id,
    jsonb_build_object(
      'status', v_application.status,
      'household_id', v_household.id,
      'neighborhood', p_neighborhood
    )
  );

  return v_application;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hosted table draft
--
-- The host supplies a desired net payout. The guest price is derived here using
-- the same integer ceiling division as src/features/pricing/pricing.ts, so the
-- host never loses a kuruş to rounding and the client cannot propose a price.
-- ---------------------------------------------------------------------------

create or replace function public.create_hosted_table_draft(
  p_profile_id uuid,
  p_menu_title text,
  p_menu_description text,
  p_starts_at timestamptz,
  p_format public.table_format,
  p_proposed_capacity integer,
  p_minimum_guest_count integer,
  p_host_net_payout_kurus integer,
  p_atmosphere text,
  p_expected_household_participants text,
  p_practical_information text,
  p_accessibility_information text default ''
)
returns public.hosted_tables
language plpgsql
as $$
declare
  v_household public.households;
  v_certification public.host_certifications;
  v_policy public.pricing_policies;
  v_address public.household_private_addresses;
  v_table public.hosted_tables;
  v_guest_price integer;
  v_active_tables integer;
  v_slug text;
begin
  select h.* into v_household
  from public.households h
  where h.owner_profile_id = p_profile_id and h.status = 'certified'
  order by h.created_at
  limit 1;

  if not found then
    raise exception 'no certified household for this host' using errcode = 'SF011';
  end if;

  select c.* into v_certification
  from public.host_certifications c
  where c.household_id = v_household.id and c.status = 'active'
    and (c.valid_from is null or c.valid_from <= now())
    and (c.valid_until is null or c.valid_until > now())
  order by c.created_at desc
  limit 1;

  if not found then
    raise exception 'no active certification' using errcode = 'SF012';
  end if;

  select a.* into v_address
  from public.household_private_addresses a
  where a.household_id = v_household.id;

  if not found then
    raise exception 'household has no verified address' using errcode = 'SF013';
  end if;

  select p.* into v_policy
  from public.pricing_policies p
  where p.active_from <= now()
    and (p.active_until is null or p.active_until > now())
  order by p.active_from desc
  limit 1;

  if not found then
    raise exception 'no active pricing policy' using errcode = 'SF006';
  end if;

  if p_proposed_capacity > v_certification.certified_traveler_capacity then
    raise exception 'capacity exceeds certification' using errcode = 'SF014';
  end if;

  if p_starts_at < now() + make_interval(days => v_policy.minimum_lead_days) then
    raise exception 'dinner is sooner than the minimum lead time' using errcode = 'SF015';
  end if;

  if p_starts_at > now() + make_interval(days => v_policy.maximum_horizon_days) then
    raise exception 'dinner is beyond the publishing horizon' using errcode = 'SF015';
  end if;

  select count(*) into v_active_tables
  from public.hosted_tables t
  where t.household_id = v_household.id
    and t.status in ('draft', 'submitted', 'changes_requested', 'approved',
                     'published', 'minimum_reached', 'confirmed', 'roster_locked');

  if v_active_tables >= v_policy.new_host_active_table_limit then
    raise exception 'active table limit reached' using errcode = 'SF016';
  end if;

  -- Integer ceiling division: guest_total = ceil(host_net * 10000 / (10000 - take_rate)).
  v_guest_price := (
    (p_host_net_payout_kurus::bigint * 10000
      + (10000 - v_policy.take_rate_basis_points) - 1)
    / (10000 - v_policy.take_rate_basis_points)
  )::integer;

  v_slug := left(public.slugify(p_menu_title), 60) || '-' || substr(md5(random()::text), 1, 6);

  insert into public.hosted_tables (
    slug, household_id, lead_verified_host_id, private_address_id,
    pricing_policy_id, starts_at, public_neighborhood, format, menu_title,
    menu_description, atmosphere, expected_household_participants,
    practical_information, accessibility_information, proposed_capacity,
    certified_capacity, available_seats, minimum_guest_count,
    host_net_payout_kurus, guest_price_kurus, booking_cutoff_at,
    roster_lock_at, status
  ) values (
    v_slug, v_household.id, p_profile_id, v_address.id,
    v_policy.id, p_starts_at, v_address.district, p_format, p_menu_title,
    p_menu_description, p_atmosphere, p_expected_household_participants,
    p_practical_information, coalesce(p_accessibility_information, ''),
    p_proposed_capacity,
    v_certification.certified_traveler_capacity, p_proposed_capacity,
    p_minimum_guest_count,
    p_host_net_payout_kurus, v_guest_price,
    p_starts_at - make_interval(hours => v_policy.booking_cutoff_hours),
    p_starts_at - make_interval(hours => v_policy.roster_lock_hours),
    'draft'
  )
  returning * into v_table;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'hosted_table.draft_created', 'hosted_table', v_table.id,
    jsonb_build_object(
      'status', v_table.status,
      'starts_at', v_table.starts_at,
      'proposed_capacity', v_table.proposed_capacity,
      'host_net_payout_kurus', v_table.host_net_payout_kurus,
      'guest_price_kurus', v_table.guest_price_kurus
    )
  );

  return v_table;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hosted table submission
-- ---------------------------------------------------------------------------

create or replace function public.submit_hosted_table(
  p_profile_id uuid,
  p_table_id uuid
)
returns public.hosted_tables
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_previous public.hosted_table_status;
begin
  select t.* into v_table
  from public.hosted_tables t
  join public.households h on h.id = t.household_id
  where t.id = p_table_id and h.owner_profile_id = p_profile_id
  for update of t;

  if not found then
    raise exception 'table not found for this host' using errcode = 'SF001';
  end if;

  if v_table.status not in ('draft', 'changes_requested') then
    raise exception 'only an editable table may be submitted' using errcode = 'SF002';
  end if;

  if not exists (
    select 1 from public.host_certifications c
    where c.household_id = v_table.household_id and c.status = 'active'
      and (c.valid_from is null or c.valid_from <= now())
      and (c.valid_until is null or c.valid_until > now())
  ) then
    raise exception 'no active certification' using errcode = 'SF012';
  end if;

  v_previous := v_table.status;

  update public.hosted_tables
  set status = 'submitted'
  where id = p_table_id
  returning * into v_table;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, previous_state, new_state
  ) values (
    p_profile_id, 'hosted_table.submitted', 'hosted_table', v_table.id,
    jsonb_build_object('status', v_previous),
    jsonb_build_object('status', v_table.status)
  );

  return v_table;
end;
$$;
