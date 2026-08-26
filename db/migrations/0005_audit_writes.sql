-- Makes booking writes self-auditing.
--
-- The audit insert lives inside the same function, and therefore the same
-- transaction, as the write it records. A booking cannot be created or
-- cancelled without producing an audit row: if the audit insert fails, the
-- booking rolls back with it.
--
-- Audit payloads carry lifecycle and money state only. Guest names, dietary
-- disclosures, and addresses are never recorded here.

create or replace function public.create_booking(
  p_profile_id uuid,
  p_table_id uuid,
  p_party_size integer,
  p_party_type text,
  p_policy_snapshot jsonb,
  p_referral_attribution_id uuid default null
)
returns public.bookings
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_policy public.pricing_policies;
  v_booking public.bookings;
  v_guest_total integer;
  v_host_net integer;
  v_fee integer;
  v_commission integer := 0;
  v_commission_bps integer := 0;
begin
  if p_party_size is null or p_party_size < 1 then
    raise exception 'party size must be at least 1' using errcode = 'SF005';
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
    party_size, party_type, status, payment_status,
    host_net_payout_kurus, sofra_gross_fee_kurus, partner_commission_kurus,
    guest_total_kurus, take_rate_basis_points, currency, policy_snapshot
  ) values (
    p_table_id, p_profile_id, p_referral_attribution_id,
    p_party_size, p_party_type, 'draft', 'not_started',
    v_host_net, v_fee, v_commission,
    v_guest_total, v_policy.take_rate_basis_points, v_table.currency,
    p_policy_snapshot
  )
  returning * into v_booking;

  update public.hosted_tables
  set available_seats = available_seats - p_party_size
  where id = p_table_id;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, new_state
  ) values (
    p_profile_id, 'booking.created', 'booking', v_booking.id,
    jsonb_build_object(
      'hosted_table_id', p_table_id,
      'party_size', v_booking.party_size,
      'status', v_booking.status,
      'payment_status', v_booking.payment_status,
      'guest_total_kurus', v_booking.guest_total_kurus,
      'seats_remaining', v_table.available_seats - p_party_size
    )
  );

  return v_booking;
end;
$$;

create or replace function public.cancel_booking(
  p_profile_id uuid,
  p_booking_id uuid,
  p_reason text default null
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_previous public.booking_status;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;

  if v_booking.primary_traveler_id <> p_profile_id then
    raise exception 'booking does not belong to this traveller' using errcode = 'SF008';
  end if;

  if v_booking.status in ('cancelled', 'refunded', 'completed') then
    raise exception 'booking cannot be cancelled from its current state' using errcode = 'SF002';
  end if;

  v_previous := v_booking.status;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason
  where id = p_booking_id
  returning * into v_booking;

  update public.hosted_tables
  set available_seats = least(
        available_seats + v_booking.party_size,
        certified_capacity
      )
  where id = v_booking.hosted_table_id;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_profile_id, 'booking.cancelled', 'booking', v_booking.id, p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object(
      'status', v_booking.status,
      'party_size', v_booking.party_size,
      'seats_returned', v_booking.party_size
    )
  );

  return v_booking;
end;
$$;
