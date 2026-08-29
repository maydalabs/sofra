-- Dwelling type on the household address.
--
-- The market research (docs/MARKET_EVIDENCE.md §4.2) found that the binding
-- constraint on Turkish home dining is property law: KMK md. 24 requires the
-- unanimous consent of every flat owner in a condominium building, and a
-- müstakil (detached) house has no co-owners to consent. If a lawyer confirms
-- that reading, launch geography is decided by building type -- which means
-- Sofra must know, from the first address a host ever enters, what kind of
-- building each home is.
--
-- Collected now, whatever the lawyer answers: if flats are constrained the
-- field is the triage signal; if they are not, it is harmless context.

alter table public.household_private_addresses
  add column if not exists dwelling_type text
  check (dwelling_type in ('apartment_flat', 'detached_house', 'other'));

comment on column public.household_private_addresses.dwelling_type is
  'Building type of the home. Coarse and non-sensitive, unlike the rest of this row: it may appear in audit payloads and operator views. Null = entered before the field existed.';

drop function if exists public.submit_host_address(uuid, text, text, text, text, text, text);

create or replace function public.submit_host_address(
  p_profile_id uuid,
  p_address_line_1 text,
  p_address_line_2 text,
  p_district text,
  p_city text,
  p_postal_code text,
  p_arrival_instructions text,
  p_dwelling_type text default null
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

  if p_dwelling_type is not null
    and p_dwelling_type not in ('apartment_flat', 'detached_house', 'other') then
    raise exception 'unknown dwelling type' using errcode = 'SF031';
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
    postal_code, arrival_instructions, dwelling_type, verified_at, verified_by
  ) values (
    v_household.id, btrim(p_address_line_1), nullif(btrim(p_address_line_2), ''),
    btrim(p_district), btrim(p_city), nullif(btrim(p_postal_code), ''),
    nullif(btrim(p_arrival_instructions), ''), p_dwelling_type, null, null
  )
  on conflict (household_id) do update set
    address_line_1 = excluded.address_line_1,
    address_line_2 = excluded.address_line_2,
    district = excluded.district,
    city = excluded.city,
    postal_code = excluded.postal_code,
    arrival_instructions = excluded.arrival_instructions,
    dwelling_type = excluded.dwelling_type,
    verified_at = null,
    verified_by = null
  returning * into v_address;

  -- District, city, and dwelling type only -- never the address text.
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
      'dwelling_type', v_address.dwelling_type,
      'verification', 'pending'
    )
  );

  return v_address;
end;
$$;
