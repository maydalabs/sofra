-- The cancellation and refund policy, decided by the product owner 2026-08-29:
--
--   cancel before the booking cutoff  -> 100% refund
--   cancel after the booking cutoff   ->  50% refund
--   no-show                           ->   0% (enforced by the absence of any
--                                            refund trigger; nothing to build)
--   platform cancels the dinner       -> 100%, always -- a rule, not a config
--
-- Of the retained portion on a partial refund, the host is compensated first,
-- up to their net for those seats; the platform keeps only what remains.
--
-- Percentages live in the pricing policy as basis points, like the take rate:
-- the numbers are launch hypotheses, the structure is the decision.

alter table public.pricing_policies
  add column if not exists refund_before_cutoff_basis_points integer not null default 10000
    check (refund_before_cutoff_basis_points between 0 and 10000),
  add column if not exists refund_after_cutoff_basis_points integer not null default 5000
    check (refund_after_cutoff_basis_points between 0 and 10000);

alter table public.bookings
  add column if not exists refund_due_kurus integer not null default 0
    check (refund_due_kurus >= 0),
  add column if not exists host_compensation_kurus integer not null default 0
    check (host_compensation_kurus >= 0);

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
  v_table public.hosted_tables;
  v_policy public.pricing_policies;
  v_previous public.booking_status;
  v_before_cutoff boolean;
  v_bps integer;
  v_refund integer := 0;
  v_retained integer := 0;
  v_host_comp integer := 0;
  v_was_paid boolean;
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

  select * into v_table from public.hosted_tables
  where id = v_booking.hosted_table_id
  for update;

  v_before_cutoff := now() < v_table.booking_cutoff_at;

  -- The snapshot the traveller booked under governs their refund, not
  -- whatever the policy says today.
  select * into v_policy from public.pricing_policies
  where id = v_table.pricing_policy_id;

  v_bps := case when v_before_cutoff
    then coalesce(v_policy.refund_before_cutoff_basis_points, 10000)
    else coalesce(v_policy.refund_after_cutoff_basis_points, 5000) end;

  -- A refund is owed only on money actually collected. Until a payment
  -- provider exists every booking is not_started and this stays zero.
  v_was_paid := v_booking.payment_status in ('created', 'authorized', 'held');

  if v_was_paid then
    -- Ceiling division: rounding favours the traveller, the same way pricing
    -- rounding favours the host.
    v_refund := ((v_booking.guest_total_kurus::bigint * v_bps + 9999) / 10000)::integer;
    v_retained := v_booking.guest_total_kurus - v_refund;
    -- Host first, up to their net for these seats; the platform keeps the rest.
    v_host_comp := least(v_retained, v_booking.host_net_payout_kurus);
  end if;

  v_previous := v_booking.status;

  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      refund_status = case when v_was_paid then 'requested' else refund_status end,
      refund_due_kurus = v_refund,
      host_compensation_kurus = v_host_comp
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
      'seats_returned', v_booking.party_size,
      'before_cutoff', v_before_cutoff,
      'refund_basis_points', v_bps,
      'was_paid', v_was_paid,
      'refund_due_kurus', v_refund,
      'host_compensation_kurus', v_host_comp
    )
  );

  return v_booking;
end;
$$;
