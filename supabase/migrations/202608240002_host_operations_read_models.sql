create or replace function public.get_my_host_roster(requested_table_id uuid)
returns table (
  id uuid,
  table_id uuid,
  party_size integer,
  status public.booking_status,
  compatibility_status public.compatibility_status
)
language sql
stable
security definer
set search_path = ''
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
  where b.hosted_table_id = requested_table_id
    and h.owner_profile_id = (select auth.uid())
    and b.status in ('confirmed', 'completed')
  order by b.created_at;
$$;

drop policy if exists bookings_serving_host_read on public.bookings;

revoke all on function public.get_my_host_roster(uuid) from public, anon;
grant execute on function public.get_my_host_roster(uuid) to authenticated;

comment on function public.get_my_host_roster(uuid) is
  'Serving-host roster read model. Returns only party size, booking lifecycle, and compatibility status for confirmed or completed bookings owned by the authenticated host household. Excludes guest names, dietary text, addresses, payment detail, and internal records.';
