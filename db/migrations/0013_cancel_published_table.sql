-- Platform cancellation of a scheduled dinner.
--
-- The operational tool for a shared dinner that misses its minimum guest
-- count, a host who withdraws, or a safety decision. Implements the decided
-- rule that has had no mechanism until now: when the platform cancels,
-- every traveller is refunded 100%, regardless of cutoff.
--
-- Everything happens in one transaction: every open booking is cancelled and
-- owed its full collected amount, the table closes, unreleased payouts for the
-- dinner are held so money for a dinner that never happened cannot leave, and
-- each transition is audited individually -- support will be asked "what
-- happened to MY booking", not "what happened to the table".

create or replace function public.cancel_published_table(
  p_operator_id uuid,
  p_table_id uuid,
  p_reason text
)
returns table (
  table_id uuid,
  bookings_cancelled integer,
  refund_due_total_kurus bigint,
  payouts_held integer
)
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_previous public.hosted_table_status;
  v_booking record;
  v_refund integer;
  v_was_paid boolean;
  v_cancelled integer := 0;
  v_refund_total bigint := 0;
  v_payouts_held integer;
begin
  perform public.assert_operator(p_operator_id);

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'cancelling a dinner requires a reason' using errcode = 'SF025';
  end if;

  select * into v_table from public.hosted_tables
  where id = p_table_id
  for update;

  if not found then
    raise exception 'table not found' using errcode = 'SF001';
  end if;

  -- Draft and submitted tables have host- and review-side paths already;
  -- completed, cancelled, and archived dinners are settled history.
  if v_table.status not in (
    'approved', 'published', 'minimum_reached', 'confirmed', 'roster_locked'
  ) then
    raise exception 'this table cannot be platform-cancelled from its current state'
      using errcode = 'SF027';
  end if;

  v_previous := v_table.status;

  for v_booking in
    select * from public.bookings
    where hosted_table_id = p_table_id
      and status in (
        'draft', 'awaiting_payment', 'payment_authorized',
        'pending_minimum', 'confirmed'
      )
    for update
  loop
    v_was_paid := v_booking.payment_status in ('created', 'authorized', 'held');
    -- Platform cancellation: 100% back, nothing retained, so no host
    -- compensation. A rule, not a configuration.
    v_refund := case when v_was_paid then v_booking.guest_total_kurus else 0 end;

    update public.bookings
    set status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        refund_status = case when v_was_paid then 'requested' else refund_status end,
        refund_due_kurus = v_refund,
        host_compensation_kurus = 0
    where id = v_booking.id;

    insert into public.audit_logs (
      actor_profile_id, action, entity_type, entity_id, reason,
      previous_state, new_state
    ) values (
      p_operator_id, 'booking.cancelled_by_platform', 'booking', v_booking.id,
      p_reason,
      jsonb_build_object('status', v_booking.status),
      jsonb_build_object(
        'status', 'cancelled',
        'refund_due_kurus', v_refund,
        'refund_basis_points', 10000,
        'was_paid', v_was_paid
      )
    );

    v_cancelled := v_cancelled + 1;
    v_refund_total := v_refund_total + v_refund;
  end loop;

  update public.hosted_tables
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason
  where id = p_table_id;

  -- Money for a dinner that never happened must not leave. Held, not deleted:
  -- the operator resolves each one deliberately, on the payout screen.
  update public.payout_records
  set status = 'held',
      hold_reason = 'Dinner cancelled: ' || p_reason
  where hosted_table_id = p_table_id
    and status <> 'released';

  get diagnostics v_payouts_held = row_count;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'hosted_table.cancelled_by_platform', 'hosted_table',
    p_table_id, p_reason,
    jsonb_build_object('status', v_previous),
    jsonb_build_object(
      'status', 'cancelled',
      'bookings_cancelled', v_cancelled,
      'refund_due_total_kurus', v_refund_total,
      'payouts_held', v_payouts_held
    )
  );

  return query select p_table_id, v_cancelled, v_refund_total, v_payouts_held;
end;
$$;
