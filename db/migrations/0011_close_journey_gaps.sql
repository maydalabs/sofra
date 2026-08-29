-- Closes the three dead-ends left in the real journey:
--
--   1. A host had no way to enter their household address, so a newly
--      certified host could never schedule a table (SF013).
--   2. The booking form collected guest names and a dietary disclosure and
--      create_booking dropped both. Worse, a booking's compatibility_status
--      stayed 'not_required' even when the traveller declared a severe
--      allergy -- the domain layer computed 'pending' and the database never
--      heard about it.
--   3. Public reviews were created unpublished and nothing could ever publish
--      them; dietary compatibility had no decision path either.

-- ---------------------------------------------------------------------------
-- Unclassified dietary input
--
-- The traveller submits free text. Classifying it (allergy vs preference,
-- severe vs low) is the reviewer's judgement, and fabricating a classification
-- at insert time would be a lie in a safety-relevant field. 'undetermined'
-- says plainly: disclosed, not yet assessed.
-- ---------------------------------------------------------------------------

alter type public.dietary_kind add value if not exists 'undetermined';

alter table public.dietary_disclosures
  drop constraint if exists dietary_disclosures_importance_check;
alter table public.dietary_disclosures
  add constraint dietary_disclosures_importance_check
  check (importance in ('undetermined', 'low', 'important', 'severe'));

-- Review moderation state. Pending = both null. A review is never deleted by
-- moderation; a rejected one simply never publishes, and the trail shows who
-- decided.
alter table public.public_experience_reviews
  add column if not exists rejected_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id);

-- ---------------------------------------------------------------------------
-- 1. Host address entry
-- ---------------------------------------------------------------------------

create or replace function public.submit_host_address(
  p_profile_id uuid,
  p_address_line_1 text,
  p_address_line_2 text,
  p_district text,
  p_city text,
  p_postal_code text,
  p_arrival_instructions text
)
returns public.household_private_addresses
language plpgsql
as $$
declare
  v_household public.households;
  v_address public.household_private_addresses;
  v_is_update boolean;
begin
  if nullif(btrim(p_address_line_1), '') is null
    or nullif(btrim(p_district), '') is null
    or nullif(btrim(p_city), '') is null then
    raise exception 'address line, district, and city are required'
      using errcode = 'SF031';
  end if;

  select h.* into v_household
  from public.households h
  where h.owner_profile_id = p_profile_id
    and h.status in ('applicant', 'certified')
  order by h.created_at
  limit 1;

  if not found then
    raise exception 'no household for this host' using errcode = 'SF011';
  end if;

  v_is_update := exists (
    select 1 from public.household_private_addresses
    where household_id = v_household.id
  );

  -- Any change clears verification: an address an operator has not seen is an
  -- address an operator has not seen, whether it is the first or the fifth.
  insert into public.household_private_addresses (
    household_id, address_line_1, address_line_2, district, city,
    postal_code, arrival_instructions, verified_at, verified_by
  ) values (
    v_household.id, btrim(p_address_line_1), nullif(btrim(p_address_line_2), ''),
    btrim(p_district), btrim(p_city), nullif(btrim(p_postal_code), ''),
    nullif(btrim(p_arrival_instructions), ''), null, null
  )
  on conflict (household_id) do update set
    address_line_1 = excluded.address_line_1,
    address_line_2 = excluded.address_line_2,
    district = excluded.district,
    city = excluded.city,
    postal_code = excluded.postal_code,
    arrival_instructions = excluded.arrival_instructions,
    verified_at = null,
    verified_by = null
  returning * into v_address;

  -- The audit row records that an address exists and where only at the level
  -- Sofra already publishes (district). Never the address text.
  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id,
    case when v_is_update then 'household_address.updated'
         else 'household_address.submitted' end,
    'household_private_address', v_address.id,
    jsonb_build_object(
      'household_id', v_household.id,
      'district', v_address.district,
      'city', v_address.city,
      'verification', 'pending'
    )
  );

  return v_address;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Booking write carries the party and the disclosure
-- ---------------------------------------------------------------------------

drop function if exists public.create_booking(uuid, uuid, integer, text, jsonb, uuid);

create or replace function public.create_booking(
  p_profile_id uuid,
  p_table_id uuid,
  p_party_size integer,
  p_party_type text,
  p_policy_snapshot jsonb,
  p_primary_guest_name text,
  p_primary_guest_email text default null,
  p_additional_guest_names text[] default '{}',
  p_dietary_disclosure text default null,
  p_referral_attribution_id uuid default null
)
returns public.bookings
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_policy public.pricing_policies;
  v_booking public.bookings;
  v_primary_guest public.booking_guests;
  v_guest_total integer;
  v_host_net integer;
  v_fee integer;
  v_commission integer := 0;
  v_commission_bps integer := 0;
  v_disclosure text := nullif(btrim(coalesce(p_dietary_disclosure, '')), '');
  v_guest_name text;
begin
  if p_party_size is null or p_party_size < 1 then
    raise exception 'party size must be at least 1' using errcode = 'SF005';
  end if;

  if nullif(btrim(coalesce(p_primary_guest_name, '')), '') is null then
    raise exception 'the primary guest needs a name' using errcode = 'SF005';
  end if;

  select * into v_table
  from public.hosted_tables
  where id = p_table_id
  for update;

  if not found then
    raise exception 'hosted table not found' using errcode = 'SF001';
  end if;

  if v_table.status not in ('published', 'minimum_reached', 'confirmed') then
    raise exception 'hosted table is not open for booking' using errcode = 'SF002';
  end if;

  if now() >= v_table.booking_cutoff_at then
    raise exception 'booking cutoff has passed' using errcode = 'SF003';
  end if;

  if p_party_size > v_table.available_seats then
    raise exception 'not enough seats remain' using errcode = 'SF004';
  end if;

  select * into v_policy
  from public.pricing_policies
  where id = v_table.pricing_policy_id;

  if not found then
    raise exception 'pricing policy not found for table' using errcode = 'SF006';
  end if;

  if v_table.format = 'shared' and p_party_size > v_policy.maximum_shared_party_size then
    raise exception 'party exceeds the shared-table maximum' using errcode = 'SF005';
  end if;

  if p_party_size > v_table.certified_capacity then
    raise exception 'party exceeds certified capacity' using errcode = 'SF005';
  end if;

  v_guest_total := v_table.guest_price_kurus * p_party_size;
  v_host_net := v_table.host_net_payout_kurus * p_party_size;
  v_fee := v_guest_total - v_host_net;

  if v_fee < 0 then
    raise exception 'table pricing is inconsistent' using errcode = 'SF007';
  end if;

  if p_referral_attribution_id is not null then
    select coalesce(po.commission_basis_points, 0) into v_commission_bps
    from public.referral_attributions ra
    join public.partner_organizations po on po.id = ra.partner_organization_id
    where ra.id = p_referral_attribution_id;

    v_commission := least(
      floor((v_guest_total * coalesce(v_commission_bps, 0)) / 10000)::integer,
      v_fee
    );
  end if;

  insert into public.bookings (
    hosted_table_id, primary_traveler_id, referral_attribution_id,
    party_size, party_type, status, compatibility_status, payment_status,
    host_net_payout_kurus, sofra_gross_fee_kurus, partner_commission_kurus,
    guest_total_kurus, take_rate_basis_points, currency, policy_snapshot
  ) values (
    p_table_id, p_profile_id, p_referral_attribution_id,
    p_party_size, p_party_type, 'draft',
    -- A disclosure means someone must assess it before this dinner is
    -- compatible. This is the invariant the previous version broke.
    case when v_disclosure is null
      then 'not_required'::public.compatibility_status
      else 'pending'::public.compatibility_status end,
    'not_started',
    v_host_net, v_fee, v_commission,
    v_guest_total, v_policy.take_rate_basis_points, v_table.currency,
    p_policy_snapshot
  )
  returning * into v_booking;

  insert into public.booking_guests (booking_id, full_name, email, is_primary)
  values (
    v_booking.id, btrim(p_primary_guest_name),
    nullif(btrim(coalesce(p_primary_guest_email, '')), ''), true
  )
  returning * into v_primary_guest;

  foreach v_guest_name in array coalesce(p_additional_guest_names, '{}') loop
    if nullif(btrim(v_guest_name), '') is not null then
      insert into public.booking_guests (booking_id, full_name, is_primary)
      values (v_booking.id, btrim(v_guest_name), false);
    end if;
  end loop;

  if v_disclosure is not null then
    insert into public.dietary_disclosures (
      booking_id, booking_guest_id, kind, importance, explanation
    ) values (
      v_booking.id, v_primary_guest.id, 'undetermined', 'undetermined',
      v_disclosure
    );
  end if;

  update public.hosted_tables
  set available_seats = available_seats - p_party_size
  where id = p_table_id;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'booking.created', 'booking', v_booking.id,
    -- Party size and lifecycle only. Names and dietary text never audit.
    jsonb_build_object(
      'hosted_table_id', p_table_id,
      'party_size', v_booking.party_size,
      'status', v_booking.status,
      'compatibility_status', v_booking.compatibility_status,
      'payment_status', v_booking.payment_status,
      'guest_total_kurus', v_booking.guest_total_kurus,
      'seats_remaining', v_table.available_seats - p_party_size
    )
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Dietary compatibility decision
--
-- The operator mediates: hosts never see disclosure text (the roster excludes
-- it by design), so the operator reads it, confirms with the household
-- off-platform, and records the outcome here.
-- ---------------------------------------------------------------------------

create or replace function public.decide_dietary_compatibility(
  p_operator_id uuid,
  p_booking_id uuid,
  p_decision text,
  p_private_reason text default null
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_next public.compatibility_status;
begin
  perform public.assert_operator(p_operator_id);

  if p_decision not in ('accepted', 'declined') then
    raise exception 'unknown compatibility decision' using errcode = 'SF025';
  end if;

  select * into v_booking from public.bookings
  where id = p_booking_id for update;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;

  if v_booking.compatibility_status <> 'pending' then
    raise exception 'this booking is not awaiting a compatibility decision'
      using errcode = 'SF025';
  end if;

  v_next := p_decision::public.compatibility_status;

  insert into public.dietary_compatibility_decisions (
    booking_id, status, reviewer_profile_id, private_reason
  ) values (p_booking_id, v_next, p_operator_id, p_private_reason);

  update public.bookings
  set compatibility_status = v_next
  where id = p_booking_id
  returning * into v_booking;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id,
    previous_state, new_state
  ) values (
    p_operator_id, 'dietary_compatibility.' || p_decision, 'booking',
    p_booking_id,
    jsonb_build_object('compatibility_status', 'pending'),
    -- The decision, never the disclosure or the reviewer's private note.
    jsonb_build_object('compatibility_status', v_next)
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Review moderation
-- ---------------------------------------------------------------------------

create or replace function public.moderate_public_review(
  p_operator_id uuid,
  p_review_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.public_experience_reviews
language plpgsql
as $$
declare
  v_review public.public_experience_reviews;
begin
  perform public.assert_operator(p_operator_id);

  if p_decision not in ('publish', 'reject') then
    raise exception 'unknown moderation decision' using errcode = 'SF025';
  end if;

  select * into v_review from public.public_experience_reviews
  where id = p_review_id for update;

  if not found then
    raise exception 'review not found' using errcode = 'SF001';
  end if;

  if v_review.published_at is not null or v_review.rejected_at is not null then
    raise exception 'this review has already been moderated'
      using errcode = 'SF025';
  end if;

  update public.public_experience_reviews
  set published_at = case when p_decision = 'publish' then now() end,
      rejected_at = case when p_decision = 'reject' then now() end,
      moderated_by = p_operator_id
  where id = p_review_id
  returning * into v_review;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason, new_state
  ) values (
    p_operator_id, 'public_review.' || p_decision || 'ed',
    'public_experience_review', v_review.id, p_reason,
    jsonb_build_object('rating', v_review.rating)
  );

  return v_review;
end;
$$;
