-- Reference data. Safe to apply to any environment including production, and
-- safe to re-run.
--
-- This file contains no people and no fictional content. Development fixtures
-- live separately and are never applied to a deployed database.

insert into public.roles (code, description) values
  ('traveler', 'May browse and manage their own bookings'),
  ('host_applicant', 'May manage their own host application'),
  ('certified_host', 'May manage an approved household and proposed tables'),
  ('partner_user', 'May access partner referral summaries'),
  ('operator', 'May perform reviewed operational actions'),
  ('administrator', 'May perform privileged administrative actions')
on conflict (code) do nothing;

-- Phase 1 launch-policy hypothesis. These are defaults, not final decisions --
-- see docs/OPEN_QUESTIONS.md. Values mirror docs/DECISIONS.md.
insert into public.pricing_policies (
  id, name, currency, take_rate_basis_points, minimum_lead_days,
  maximum_horizon_days, booking_cutoff_hours, roster_lock_hours,
  shared_minimum_travelers, maximum_shared_party_size,
  new_host_active_table_limit, new_host_weekly_dinner_limit, active_from
) values (
  '20000000-0000-4000-8000-000000000001',
  'Phase 1 development default',
  'TRY', 2500, 7, 35, 36, 24, 2, 2, 2, 2, now()
) on conflict (id) do nothing;
