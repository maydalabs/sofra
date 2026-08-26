-- Development fixtures. Fictional people, fictional households, fictional
-- addresses. NEVER apply to a deployed database.
--
--   pnpm db:fixtures
--
-- Requires db/seed.sql (roles and the pricing policy) to have been applied.

-- The signup trigger would generate its own profile rows with random ids, but
-- these fixtures depend on stable uuids that later inserts reference. Suspend
-- it while seeding, then restore it.
alter table public."user" disable trigger on_auth_user_created;

insert into public."user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values
  ('demo-user-01', 'Ayşe', 'demo01@sofra.invalid', true, now(), now()),
  ('demo-user-02', 'Selma', 'demo02@sofra.invalid', true, now(), now()),
  ('demo-user-03', 'Figen', 'demo03@sofra.invalid', true, now(), now()),
  ('demo-user-04', 'Deniz', 'demo04@sofra.invalid', true, now(), now()),
  ('demo-user-05', 'Kemal', 'demo05@sofra.invalid', true, now(), now()),
  ('demo-user-06', 'Ece', 'demo06@sofra.invalid', true, now(), now()),
  ('demo-user-07', 'Selin', 'demo07@sofra.invalid', true, now(), now()),
  ('demo-user-08', 'Demo Traveler', 'demo08@sofra.invalid', true, now(), now()),
  ('demo-user-09', 'Demo Operator', 'demo09@sofra.invalid', true, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, auth_user_id, display_name, preferred_locale) values
  ('10000000-0000-4000-8000-000000000001', 'demo-user-01', 'Ayşe', 'tr'),
  ('10000000-0000-4000-8000-000000000002', 'demo-user-02', 'Selma', 'tr'),
  ('10000000-0000-4000-8000-000000000003', 'demo-user-03', 'Figen', 'tr'),
  ('10000000-0000-4000-8000-000000000004', 'demo-user-04', 'Deniz', 'tr'),
  ('10000000-0000-4000-8000-000000000005', 'demo-user-05', 'Kemal', 'tr'),
  ('10000000-0000-4000-8000-000000000006', 'demo-user-06', 'Ece', 'tr'),
  ('10000000-0000-4000-8000-000000000007', 'demo-user-07', 'Selin', 'tr'),
  ('10000000-0000-4000-8000-000000000008', 'demo-user-08', 'Demo Traveler', 'en'),
  ('10000000-0000-4000-8000-000000000009', 'demo-user-09', 'Demo Operator', 'tr')
on conflict (id) do nothing;

insert into public.role_assignments (profile_id, role_id) values
  ('10000000-0000-4000-8000-000000000001', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000002', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000003', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000004', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000005', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000006', (select id from public.roles where code = 'certified_host')),
  ('10000000-0000-4000-8000-000000000006', (select id from public.roles where code = 'partner_user')),
  ('10000000-0000-4000-8000-000000000007', (select id from public.roles where code = 'host_applicant')),
  ('10000000-0000-4000-8000-000000000008', (select id from public.roles where code = 'traveler')),
  ('10000000-0000-4000-8000-000000000009', (select id from public.roles where code = 'operator'))
on conflict (profile_id, role_id) do nothing;

insert into public.households (id, owner_profile_id, public_name, public_story, household_structure, atmosphere, status) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ayşe & Levent’s table', 'Sunday dinner stretches into tea in this home.', 'A couple who have shared this neighborhood for three decades', 'Unhurried and story-filled', 'certified'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Nermin & Selma’s table', 'A mother and adult daughter cook together from the market.', 'A mother and adult daughter', 'Warm and curious', 'certified'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Cem & Figen’s table', 'Retired siblings compare different memories of the same family stories.', 'Retired siblings', 'Witty and musical', 'certified'),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'The Özdemir household table', 'Three generations share one lively home.', 'A multigenerational household', 'Lively and welcoming', 'certified'),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Kemal’s table', 'A widowed host welcomes visitors with his adult nephew joining later.', 'A widowed host and an adult nephew', 'Calm and reflective', 'certified'),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'Ece & Can’s table', 'A young couple blends recipes from two hometowns.', 'A young couple', 'Contemporary and relaxed', 'certified')
on conflict (id) do nothing;

insert into public.household_private_addresses (id, household_id, address_line_1, district, city, verification_notes) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'DEMO ONLY — fictional address record 1', 'Kadıköy', 'Istanbul', 'Never expose publicly'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'DEMO ONLY — fictional address record 2', 'Üsküdar', 'Istanbul', 'Never expose publicly'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'DEMO ONLY — fictional address record 3', 'Beşiktaş', 'Istanbul', 'Never expose publicly'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'DEMO ONLY — fictional address record 4', 'Şişli', 'Istanbul', 'Never expose publicly'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'DEMO ONLY — fictional address record 5', 'Kadıköy', 'Istanbul', 'Never expose publicly'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'DEMO ONLY — fictional address record 6', 'Beşiktaş', 'Istanbul', 'Never expose publicly')
on conflict (id) do nothing;

insert into public.household_members (household_id, profile_id, display_name, relationship_description, is_adult, is_verified_host) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Ayşe', 'Lead host', true, true),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Selma', 'Adult daughter and lead host', true, true),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Figen', 'Sibling and lead host', true, true),
  ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Deniz', 'Middle generation and lead host', true, true),
  ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'Kemal', 'Lead host', true, true),
  ('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'Ece', 'Lead host', true, true);

insert into public.host_certifications (id, household_id, lead_host_profile_id, status, certified_traveler_capacity, valid_from) values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'active', 6, now()),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'active', 5, now()),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'active', 4, now()),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'active', 6, now()),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'active', 4, now()),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'active', 4, now())
on conflict (id) do nothing;

insert into public.hosted_tables (
  id, slug, household_id, lead_verified_host_id, private_address_id, pricing_policy_id,
  starts_at, public_neighborhood, public_approximate_latitude, public_approximate_longitude,
  format, menu_title, menu_description, atmosphere, languages, expected_household_participants,
  practical_information, accessibility_information, proposed_capacity, certified_capacity,
  available_seats, minimum_guest_count, guaranteed_operation, host_net_payout_kurus,
  guest_price_kurus, booking_cutoff_at, roster_lock_at, status, published_at
) values
  ('60000000-0000-4000-8000-000000000001', 'ayse-levent-sunday-table', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', now() + interval '10 days', 'Moda, Kadıköy', 40.992, 29.028, 'shared', 'A slow Sunday table', 'Mercimek soup, stuffed peppers, slow-cooked beef, rice, salad, revani, and tea.', 'Unhurried and story-filled', array['Turkish','English'], 'Ayşe and Levent both join.', 'Shoes stay near the entrance.', 'Small lift and one entrance step.', 6, 6, 3, 2, false, 120000, 160000, now() + interval '8 days 12 hours', now() + interval '9 days', 'minimum_reached', now()),
  ('60000000-0000-4000-8000-000000000002', 'nermin-selma-seasonal-supper', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', now() + interval '13 days', 'Kuzguncuk, Üsküdar', 40.992, 29.028, 'shared', 'Market vegetables and family recipes', 'Yayla soup, mücver, green beans, chicken, bulgur, quince dessert, and coffee.', 'Warm and curious', array['Turkish','English','German'], 'Nermin and Selma host together.', 'No pets.', 'Ground-floor apartment.', 5, 5, 5, 2, false, 110000, 146667, now() + interval '11 days 12 hours', now() + interval '12 days', 'published', now()),
  ('60000000-0000-4000-8000-000000000003', 'cem-figen-bosphorus-evening', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', now() + interval '16 days', 'Abbasağa, Beşiktaş', 41.054, 29.008, 'private', 'An Istanbul neighborhood table at home', 'Lentil patties, börek, stuffed eggplant, pilaf, fruit, and tea.', 'Witty and musical', array['Turkish','English','French'], 'Cem and Figen join dinner and tea.', 'One private party.', 'Lift access.', 4, 4, 4, 1, true, 145000, 193334, now() + interval '14 days 12 hours', now() + interval '15 days', 'published', now()),
  ('60000000-0000-4000-8000-000000000004', 'ozdemir-three-generations', '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', now() + interval '20 days', 'Teşvikiye, Şişli', 41.054, 29.008, 'shared', 'Three generations, one table', 'Tarhana soup, vine leaves, İzmir köfte, rice, salad, and sütlaç.', 'Lively and welcoming', array['Turkish','English'], 'Three adult household members join.', 'Small dog stays in another room.', 'Lift and two entrance steps.', 6, 6, 2, 3, false, 130000, 173334, now() + interval '18 days 12 hours', now() + interval '19 days', 'confirmed', now()),
  ('60000000-0000-4000-8000-000000000005', 'kemal-neighborhood-classics', '30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', now() + interval '8 days', 'Yeldeğirmeni, Kadıköy', 40.992, 29.028, 'shared', 'Neighborhood classics after dark', 'Ezogelin soup, vegetables, kuru fasulye, rice, helva, and coffee.', 'Calm and reflective', array['Turkish','English'], 'Kemal hosts; Arda joins for dessert.', 'No pets.', 'Second floor without lift.', 4, 4, 2, 2, false, 105000, 140000, now() + interval '6 days 12 hours', now() + interval '7 days', 'roster_locked', now()),
  ('60000000-0000-4000-8000-000000000006', 'ece-can-new-istanbul-table', '30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', now() + interval '24 days', 'Gayrettepe, Beşiktaş', 41.054, 29.008, 'shared', 'Two hometowns at one Istanbul table', 'Red lentil soup, meat-free çiğ köfte, tray kebab, herbs, künefe, and tea.', 'Contemporary and relaxed', array['Turkish','English'], 'Ece and Can host together.', 'Smoke-free, no pets.', 'Step-free lift.', 4, 4, 4, 2, false, 125000, 166667, now() + interval '22 days 12 hours', now() + interval '23 days', 'submitted', null),
  ('60000000-0000-4000-8000-000000000007', 'nermin-selma-private-friday', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', now() + interval '28 days', 'Kuzguncuk, Üsküdar', 40.992, 29.028, 'private', 'A private Friday family table', 'Wedding soup, vegetables, roast chicken, bulgur, fruit, and tea.', 'Personal and unrushed', array['Turkish','English','German'], 'Nermin and Selma host.', 'One private party.', 'Ground-floor threshold.', 5, 5, 5, 1, true, 135000, 180000, now() + interval '26 days 12 hours', now() + interval '27 days', 'approved', null),
  ('60000000-0000-4000-8000-000000000008', 'cem-figen-spring-table', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', now() - interval '12 days', 'Abbasağa, Beşiktaş', 41.054, 29.008, 'shared', 'A spring table with old records', 'Börek, stuffed vegetables, pilaf, salad, fruit, and tea.', 'Witty and musical', array['Turkish','English','French'], 'Cem and Figen hosted.', 'Completed demo fixture.', 'Lift access.', 4, 4, 0, 2, false, 120000, 160000, now() - interval '13 days 12 hours', now() - interval '13 days', 'completed', now() - interval '25 days'),
  ('60000000-0000-4000-8000-000000000009', 'ayse-autumn-draft', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', now() + interval '32 days', 'Moda, Kadıköy', 40.992, 29.028, 'shared', 'Early autumn draft table', 'A complete draft menu selected by the household.', 'Unhurried and neighborly', array['Turkish','English'], 'Ayşe and Levent plan to host.', 'Draft practical information.', 'Draft accessibility information.', 6, 6, 6, 2, false, 125000, 166667, now() + interval '30 days 12 hours', now() + interval '31 days', 'draft', null)
on conflict (id) do nothing;

insert into public.host_applications (id, applicant_profile_id, status, motivation, hosting_plan, submitted_at) values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000007', 'submitted', 'Our fictional household already hosts long Sunday dinners.', 'A parent and adult child would host together.', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.partner_organizations (id, name, code, commission_basis_points) values
  ('80000000-0000-4000-8000-000000000001', 'Fictional Istanbul Partner', 'SOFRA-DEMO', 500)
on conflict (id) do nothing;
insert into public.partner_users (partner_organization_id, profile_id) values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006')
on conflict (partner_organization_id, profile_id) do nothing;
insert into public.referral_attributions (id, partner_organization_id, referral_code, attributed_profile_id) values
  ('80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'SOFRA-DEMO', '10000000-0000-4000-8000-000000000008')
on conflict (id) do nothing;

insert into public.bookings (
  id, hosted_table_id, primary_traveler_id, referral_attribution_id, party_size, party_type,
  status, compatibility_status, payment_status, host_net_payout_kurus, sofra_gross_fee_kurus,
  partner_commission_kurus, guest_total_kurus, take_rate_basis_points, policy_snapshot
) values
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000008', null, 1, 'solo', 'pending_minimum', 'accepted', 'authorized', 120000, 40000, 0, 160000, 2500, '{"policy":"Phase 1 development default"}'),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000008', '80000000-0000-4000-8000-000000000002', 2, 'couple', 'confirmed', 'not_required', 'authorized', 260000, 86668, 17334, 346668, 2500, '{"policy":"Phase 1 development default"}'),
  ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', null, 2, 'friends', 'completed', 'accepted', 'authorized', 240000, 80000, 0, 320000, 2500, '{"policy":"Phase 1 development default"}')
on conflict (id) do nothing;

insert into public.booking_guests (id, booking_id, full_name, is_primary) values
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Demo Traveler', true),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'Demo Traveler', true),
  ('71000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'Fictional Additional Guest', false)
on conflict (id) do nothing;

insert into public.dietary_disclosures (id, booking_id, booking_guest_id, kind, importance, explanation) values
  ('72000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 'allergy', 'important', 'Fictional private disclosure for compatibility testing only')
on conflict (id) do nothing;

insert into public.private_constructive_feedback (id, booking_id, author_profile_id, body) values
  ('73000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000008', 'Fictional private feedback kept separate from public reviews.')
on conflict (id) do nothing;

insert into public.safety_incidents (id, booking_id, hosted_table_id, reporter_profile_id, status, severity, confidential_report, assigned_to) values
  ('91000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', 'open', 'medium', 'Fictional confidential incident used only to verify access and payout holds.', '10000000-0000-4000-8000-000000000009')
on conflict (id) do nothing;

insert into public.payout_records (id, hosted_table_id, household_id, amount_kurus, status, hold_reason) values
  ('92000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000003', 480000, 'held', 'Related fictional safety incident remains open')
on conflict (id) do nothing;

insert into public.audit_logs (id, actor_profile_id, action, entity_type, entity_id, reason, previous_state, new_state) values
  ('93000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'hosted_table.submitted', 'hosted_table', '60000000-0000-4000-8000-000000000006', 'Host submitted a complete table', '{"status":"draft"}', '{"status":"submitted"}'),
  ('93000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009', 'payout.held', 'payout_record', '92000000-0000-4000-8000-000000000001', 'Related incident open', '{"status":"eligible"}', '{"status":"held"}')
on conflict (id) do nothing;

-- The same fictional fixture is materialized relative to the current date in
-- `src/features/hosted-tables/demo-tables.ts` so the application remains useful
-- when Docker and the Supabase CLI are unavailable.

alter table public."user" enable trigger on_auth_user_created;
