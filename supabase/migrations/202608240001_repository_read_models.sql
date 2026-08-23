create or replace function public.get_my_booking_summaries()
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
security definer
set search_path = ''
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
  where b.primary_traveler_id = (select auth.uid())
  order by ht.starts_at desc;
$$;

revoke all on function public.get_my_booking_summaries() from public, anon;
grant execute on function public.get_my_booking_summaries() to authenticated;

comment on function public.get_my_booking_summaries() is
  'Authenticated traveler-owned booking read model. Explicitly excludes exact address, arrival instructions, guest names, dietary disclosure text, and internal records.';
