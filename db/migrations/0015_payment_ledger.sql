-- The payment ledger (docs/PAYMENT_DECISION.md §7.1, §7.3).
--
-- Provider-agnostic on purpose: iyzico is plan A, but every fallback in §6.5
-- needs exactly this schema, and under PayTR we would own the whole escrow
-- ledger ourselves. What the provider knows is referenced by opaque handles;
-- the money truth lives here, in integer kuruş, enforced in SQL.
--
-- New SQLSTATE codes: SF033 amount mismatch, SF034 not payable / reference
-- reuse, SF035 refund exceeds payment, SF036 nothing refundable,
-- SF037 household not found.

-- §7.3: the two states with distinct legal consequences. 'released' means the
-- host's share was approved and will reach their IBAN — after which there is
-- no payment lever left; 'partially_refunded' means some money went back but
-- the remainder is still live in the provider's pool.
alter type public.payment_status add value if not exists 'released';
alter type public.payment_status add value if not exists 'partially_refunded';

-- The per-item provider handle (iyzico: paymentTransactionId). Every later
-- approve, disapprove, and refund is scoped to it, so it is stored the moment
-- the provider reports a settled charge.
alter table public.payment_records
  add column if not exists provider_item_reference text,
  add column if not exists provider_payment_id text;

create unique index if not exists payment_records_item_reference_key
  on public.payment_records (provider_item_reference)
  where provider_item_reference is not null;

-- One row per refund, because the policy produces repeated partials (the
-- 36h–168h tier, then a goodwill top-up) and a single status column cannot
-- represent that history. bookings.refund_status stays as the coarse
-- traveller-facing summary derived at write time.
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  payment_record_id uuid references public.payment_records(id),
  amount_kurus integer not null check (amount_kurus > 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  reason text not null,
  provider_reference text,
  -- Null actor means the platform's own job, not a person.
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists refunds_booking_id_idx
  on public.refunds (booking_id);

-- The provider's payee handle for a household (iyzico: subMerchantKey).
-- Deliberately nothing else: the TCKN and IBAN were handed to the provider,
-- who is the regulated party that must hold them. We keep only the pointer.
create table if not exists public.host_payees (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id),
  provider_code text not null,
  payee_reference text not null,
  registered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, provider_code)
);

create trigger set_host_payees_updated_at
  before update on public.host_payees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Recording a settled charge
--
-- Called after the provider confirms the traveller paid. The amount is
-- checked against what the database itself computed at booking time; a
-- provider that reports anything else is refused, never accommodated.
-- Replaying the same provider reference is a no-op so webhook retries are
-- harmless.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment_authorized(
  p_profile_id uuid,
  p_booking_id uuid,
  p_provider_code text,
  p_provider_reference text,
  p_provider_payment_id text,
  p_provider_item_reference text,
  p_amount_kurus integer,
  p_simulated boolean default false
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_table public.hosted_tables;
  v_existing public.payment_records;
  v_previous public.booking_status;
  v_next public.booking_status;
  v_minimum_reached boolean;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;

  select * into v_existing from public.payment_records
  where provider_reference = p_provider_reference;

  if found then
    if v_existing.booking_id <> p_booking_id then
      raise exception 'provider reference belongs to another booking'
        using errcode = 'SF034';
    end if;
    -- Webhook retry or double-read of the same settlement: already recorded.
    return v_booking;
  end if;

  if v_booking.status not in ('draft', 'awaiting_payment') then
    raise exception 'booking is not awaiting payment' using errcode = 'SF034';
  end if;

  if v_booking.payment_status not in ('not_started', 'created', 'failed') then
    raise exception 'booking already has a live payment' using errcode = 'SF034';
  end if;

  -- The provider is told what to charge; it does not get to define it. The
  -- only acceptable amount is the one this database computed at booking time.
  if p_amount_kurus <> v_booking.guest_total_kurus then
    raise exception 'paid amount % does not match booking total %',
      p_amount_kurus, v_booking.guest_total_kurus
      using errcode = 'SF033';
  end if;

  select * into v_table from public.hosted_tables
  where id = v_booking.hosted_table_id;

  -- Mirrors statusAfterPayment() in src/server/services/bookings.ts: a
  -- pending dietary assessment parks the booking at payment_authorized; a
  -- private table, a guarantee, or a met minimum confirms it outright.
  if v_booking.compatibility_status = 'pending' then
    v_next := 'payment_authorized';
  else
    v_minimum_reached :=
      (v_table.certified_capacity - v_table.available_seats)
        >= v_table.minimum_guest_count;
    if v_table.format = 'private'
      or v_table.guaranteed_operation
      or v_minimum_reached
      or v_table.status in ('minimum_reached', 'confirmed') then
      v_next := 'confirmed';
    else
      v_next := 'pending_minimum';
    end if;
  end if;

  insert into public.payment_records (
    booking_id, provider_code, provider_reference, provider_payment_id,
    provider_item_reference, amount_kurus, currency, status, is_simulated
  ) values (
    p_booking_id, p_provider_code, p_provider_reference,
    p_provider_payment_id, p_provider_item_reference,
    p_amount_kurus, v_booking.currency, 'authorized', p_simulated
  );

  v_previous := v_booking.status;

  update public.bookings
  set status = v_next,
      payment_status = 'authorized'
  where id = p_booking_id
  returning * into v_booking;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_profile_id, 'payment.authorized', 'booking', v_booking.id, null,
    jsonb_build_object('status', v_previous),
    jsonb_build_object(
      'status', v_booking.status,
      'payment_status', v_booking.payment_status,
      'provider_code', p_provider_code,
      'amount_kurus', p_amount_kurus,
      'simulated', p_simulated
    )
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recording a failed charge
--
-- The seat stays held and the booking stays cancellable; nothing was
-- collected, so nothing is owed.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment_failed(
  p_profile_id uuid,
  p_booking_id uuid,
  p_provider_code text,
  p_provider_reference text,
  p_simulated boolean default false
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;

  if exists (
    select 1 from public.payment_records
    where provider_reference = p_provider_reference
  ) then
    return v_booking;
  end if;

  if v_booking.payment_status in ('authorized', 'held', 'released') then
    raise exception 'booking already has a live payment' using errcode = 'SF034';
  end if;

  insert into public.payment_records (
    booking_id, provider_code, provider_reference,
    amount_kurus, currency, status, is_simulated
  ) values (
    p_booking_id, p_provider_code, p_provider_reference,
    v_booking.guest_total_kurus, v_booking.currency, 'failed', p_simulated
  );

  update public.bookings
  set payment_status = 'failed'
  where id = p_booking_id
  returning * into v_booking;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_profile_id, 'payment.failed', 'booking', v_booking.id, null,
    jsonb_build_object('payment_status', 'not_started'),
    jsonb_build_object(
      'payment_status', v_booking.payment_status,
      'provider_code', p_provider_code,
      'simulated', p_simulated
    )
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recording a refund
--
-- Refunds are only recordable while the money is still refundable — before
-- the host's share is released. After release there is no payment lever;
-- anything the platform chooses to pay then is a bank transfer from its own
-- funds, which is not a provider refund and does not belong in this ledger.
-- ---------------------------------------------------------------------------
create or replace function public.record_payment_refund(
  p_profile_id uuid,
  p_booking_id uuid,
  p_amount_kurus integer,
  p_reason text,
  p_provider_reference text default null
)
returns public.bookings
language plpgsql
as $$
declare
  v_booking public.bookings;
  v_payment public.payment_records;
  v_total_refunded bigint;
begin
  if p_amount_kurus is null or p_amount_kurus <= 0 then
    raise exception 'refund amount must be positive' using errcode = 'SF035';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found' using errcode = 'SF001';
  end if;

  if v_booking.payment_status not in ('authorized', 'held', 'partially_refunded') then
    raise exception 'booking has no refundable payment' using errcode = 'SF036';
  end if;

  select * into v_payment from public.payment_records
  where booking_id = p_booking_id and status = 'authorized'
  order by created_at desc
  limit 1;

  select coalesce(sum(amount_kurus), 0) + p_amount_kurus into v_total_refunded
  from public.refunds
  where booking_id = p_booking_id;

  if v_total_refunded > v_booking.guest_total_kurus then
    raise exception 'refund total % would exceed the % collected',
      v_total_refunded, v_booking.guest_total_kurus
      using errcode = 'SF035';
  end if;

  insert into public.refunds (
    booking_id, payment_record_id, amount_kurus, reason,
    provider_reference, created_by
  ) values (
    p_booking_id, v_payment.id, p_amount_kurus, p_reason,
    p_provider_reference, p_profile_id
  );

  update public.bookings
  set payment_status = case
        when v_total_refunded = guest_total_kurus
          then 'refunded'::public.payment_status
        else 'partially_refunded'::public.payment_status
      end,
      refund_status = case
        when refund_due_kurus > 0 and v_total_refunded >= refund_due_kurus
          then 'completed'
        else 'processing'
      end
  where id = p_booking_id
  returning * into v_booking;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_profile_id, 'payment.refunded', 'booking', v_booking.id, p_reason,
    jsonb_build_object('payment_status',
      case when v_total_refunded = p_amount_kurus
        then 'authorized' else 'partially_refunded' end),
    jsonb_build_object(
      'payment_status', v_booking.payment_status,
      'refund_amount_kurus', p_amount_kurus,
      'total_refunded_kurus', v_total_refunded
    )
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Registering a host payee
--
-- Operator-gated because it decides where a household's money goes. The
-- upsert supports re-registration (a host changes bank or provider); the
-- audit trail keeps every previous reference.
-- ---------------------------------------------------------------------------
create or replace function public.register_host_payee(
  p_operator_id uuid,
  p_household_id uuid,
  p_provider_code text,
  p_payee_reference text
)
returns public.host_payees
language plpgsql
as $$
declare
  v_payee public.host_payees;
  v_previous text;
begin
  perform public.assert_operator(p_operator_id);

  if not exists (
    select 1 from public.households where id = p_household_id
  ) then
    raise exception 'household not found' using errcode = 'SF037';
  end if;

  select payee_reference into v_previous
  from public.host_payees
  where household_id = p_household_id and provider_code = p_provider_code;

  insert into public.host_payees (
    household_id, provider_code, payee_reference, registered_by
  ) values (
    p_household_id, p_provider_code, p_payee_reference, p_operator_id
  )
  on conflict (household_id, provider_code)
  do update set payee_reference = excluded.payee_reference,
                registered_by = excluded.registered_by
  returning * into v_payee;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, reason,
    previous_state, new_state
  ) values (
    p_operator_id, 'payee.registered', 'household', p_household_id, null,
    jsonb_build_object('payee_reference', v_previous),
    jsonb_build_object(
      'provider_code', p_provider_code,
      'payee_reference', p_payee_reference
    )
  );

  return v_payee;
end;
$$;
