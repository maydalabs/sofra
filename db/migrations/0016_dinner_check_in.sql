-- The check-in artefact (docs/PAYMENT_DECISION.md §7.6).
--
-- A dinner with no attendance record is a "services not rendered" chargeback
-- lost by default — the cardholder has 120 days from the dinner to dispute,
-- and the host's payout will already be gone. The host's confirmation of who
-- actually sat at the table is the evidence, so it is a durable record with
-- an actor and a timestamp, written in the same transaction that completes
-- the bookings.
--
-- Completing the dinner is also what starts the money clock: it is the only
-- production path that moves bookings to 'completed' (which the post-dinner
-- channels require) and it creates the payout_records row the T+3 release
-- job will operate on.
--
-- New SQLSTATE codes: SF038 dinner not started, SF039 roster mismatch,
-- SF040 unresolved bookings.

alter table public.bookings
  add column if not exists completed_at timestamptz;

create table if not exists public.booking_check_ins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  hosted_table_id uuid not null references public.hosted_tables(id),
  -- False records a no-show. Under the decided policy the host is paid
  -- either way; the flag exists for evidence and for pattern review.
  attended boolean not null,
  confirmed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists booking_check_ins_table_idx
  on public.booking_check_ins (hosted_table_id);

create or replace function public.complete_dinner(
  p_host_id uuid,
  p_table_id uuid,
  p_attended_booking_ids uuid[],
  p_no_show_booking_ids uuid[]
)
returns table (
  attended_count integer,
  no_show_count integer,
  payout_amount_kurus integer,
  payout_id uuid
)
language plpgsql
as $$
declare
  v_table public.hosted_tables;
  v_confirmed_ids uuid[];
  v_listed_ids uuid[];
  v_unresolved integer;
  v_attended integer := 0;
  v_no_show integer := 0;
  v_payout_amount integer := 0;
  v_payout_id uuid;
begin
  select t.* into v_table
  from public.hosted_tables t
  join public.households h on h.id = t.household_id
  where t.id = p_table_id
    and h.owner_profile_id = p_host_id
  for update of t;

  if not found then
    raise exception 'table not found for this host' using errcode = 'SF001';
  end if;

  if v_table.status not in
    ('published', 'minimum_reached', 'confirmed', 'roster_locked') then
    raise exception 'table cannot be completed from status %', v_table.status
      using errcode = 'SF002';
  end if;

  if now() < v_table.starts_at then
    raise exception 'the dinner has not started yet' using errcode = 'SF038';
  end if;

  -- A booking that was paid but never resolved (dietary review still
  -- pending, minimum never confirmed) holds a traveller's money. Completing
  -- around it would strand that money silently; it must be decided or
  -- cancelled first.
  select count(*) into v_unresolved
  from public.bookings b
  where b.hosted_table_id = p_table_id
    and b.status in ('awaiting_payment', 'payment_authorized', 'pending_minimum');

  if v_unresolved > 0 then
    raise exception '% unresolved bookings must be decided or cancelled first',
      v_unresolved
      using errcode = 'SF040';
  end if;

  -- Every confirmed booking must be accounted for, exactly once, and
  -- nothing else may be listed. The host attests to the whole roster or to
  -- none of it.
  select coalesce(array_agg(b.id), '{}') into v_confirmed_ids
  from public.bookings b
  where b.hosted_table_id = p_table_id
    and b.status = 'confirmed';

  p_attended_booking_ids := coalesce(p_attended_booking_ids, '{}');
  p_no_show_booking_ids := coalesce(p_no_show_booking_ids, '{}');
  v_listed_ids := p_attended_booking_ids || p_no_show_booking_ids;

  if cardinality(v_confirmed_ids) = 0 then
    raise exception 'no confirmed bookings to check in' using errcode = 'SF039';
  end if;

  if exists (select 1 from unnest(p_attended_booking_ids) a
             where a = any(p_no_show_booking_ids)) then
    raise exception 'a booking cannot be both attended and a no-show'
      using errcode = 'SF039';
  end if;

  -- Exact cover: same size, no id outside the confirmed roster, no
  -- confirmed booking left unlisted. Duplicates fail the size check.
  if cardinality(v_listed_ids) <> cardinality(v_confirmed_ids)
    or exists (select 1 from unnest(v_listed_ids) l
               where l <> all(v_confirmed_ids))
    or exists (select 1 from unnest(v_confirmed_ids) c
               where c <> all(v_listed_ids)) then
    raise exception 'the lists must cover exactly the confirmed roster'
      using errcode = 'SF039';
  end if;

  insert into public.booking_check_ins (
    booking_id, hosted_table_id, attended, confirmed_by
  )
  select b.id, p_table_id, b.id = any(p_attended_booking_ids), p_host_id
  from public.bookings b
  where b.id = any(v_listed_ids);

  update public.bookings b
  set status = 'completed', completed_at = now()
  where b.id = any(v_listed_ids);

  select count(*) filter (where a.id = any(p_attended_booking_ids)),
         count(*) filter (where a.id = any(p_no_show_booking_ids)),
         coalesce(sum(a.host_net_payout_kurus), 0)
  into v_attended, v_no_show, v_payout_amount
  from public.bookings a
  where a.id = any(v_listed_ids);

  update public.hosted_tables
  set status = 'completed'
  where id = p_table_id;

  -- The host's earnings for this dinner, as one payout the release job and
  -- the operator hold/release tooling already know how to handle. No-shows
  -- are included: under the decided policy their seats are paid in full.
  if v_payout_amount > 0 then
    insert into public.payout_records (
      hosted_table_id, household_id, amount_kurus, currency, status
    ) values (
      p_table_id, v_table.household_id, v_payout_amount, 'TRY', 'pending'
    )
    returning id into v_payout_id;
  end if;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_host_id, 'dinner.completed', 'hosted_table', p_table_id, null,
    jsonb_build_object('status', v_table.status),
    jsonb_build_object(
      'status', 'completed',
      'attended_bookings', v_attended,
      'no_show_bookings', v_no_show,
      'payout_amount_kurus', v_payout_amount,
      'payout_id', v_payout_id
    )
  );

  return query select v_attended, v_no_show, v_payout_amount, v_payout_id;
end;
$$;
