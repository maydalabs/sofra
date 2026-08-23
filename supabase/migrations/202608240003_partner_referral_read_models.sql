create or replace function public.get_my_partner_referral_summary()
returns table (
  organization_id uuid,
  organization_name text,
  organization_code text,
  organization_status text,
  attribution_id uuid,
  referral_code text,
  landed_at timestamptz,
  booking_id uuid,
  booking_status public.booking_status,
  party_size integer,
  table_slug text,
  menu_title text,
  starts_at timestamptz,
  public_neighborhood text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    po.id as organization_id,
    po.name as organization_name,
    po.code as organization_code,
    po.status as organization_status,
    ra.id as attribution_id,
    ra.referral_code,
    ra.landing_at as landed_at,
    b.id as booking_id,
    b.status as booking_status,
    b.party_size,
    ht.slug as table_slug,
    ht.menu_title,
    ht.starts_at,
    ht.public_neighborhood
  from public.partner_users pu
  join public.partner_organizations po
    on po.id = pu.partner_organization_id
  left join public.referral_attributions ra
    on ra.partner_organization_id = po.id
  left join public.bookings b
    on b.referral_attribution_id = ra.id
  left join public.hosted_tables ht
    on ht.id = b.hosted_table_id
  where pu.profile_id = (select auth.uid())
    and public.has_role('partner_user'::public.application_role)
  order by po.name, ra.landing_at desc nulls last, b.created_at desc nulls last;
$$;

revoke all on function public.get_my_partner_referral_summary() from public, anon;
grant execute on function public.get_my_partner_referral_summary() to authenticated;

comment on function public.get_my_partner_referral_summary() is
  'Partner-owned referral read model. Excludes traveler identity, attribution metadata, exact address, dietary data, payment detail, commission amounts, and settlement information.';
