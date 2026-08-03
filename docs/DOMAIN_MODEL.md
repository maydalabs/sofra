# Domain model

## Identity and authorization

`profiles` extend Supabase Auth identities. `roles` define server-controlled capabilities and `role_assignments` support multiple roles per account. Client-editable profile metadata never grants authorization.

## Households and certification

A `household` contains the public story and operational status. Exact location is isolated in `household_private_addresses`. Members, applications, assessments, and certifications remain distinct. A certification records approved traveler capacity and validity; a proposed table cannot exceed it.

## Hosted tables

A `hosted_table` is the inventory unit. It binds a household and verified lead host to a specific start time, table format, public neighborhood, private address reference, fixed household-selected menu, participation, languages, practical details, capacity, price, cutoff, roster lock, and lifecycle.

Multilingual host content is represented separately in `hosted_table_translations`; original host content is not automatically translated.

## Bookings and dietary compatibility

A booking records the primary traveler, party, lifecycle, compatibility outcome, attribution, and immutable price snapshot. Additional guests are private booking children. Dietary disclosures are separate sensitive records, with a review decision and timestamp. Public projections never join them.

## Trust and operations

Public reviews, private constructive feedback, and confidential safety incidents are separate aggregates. Payments, payouts, partner referrals, administrative notes, and audit logs retain their own operational histories.

## Money

All stored amounts are integer kuruş. The price snapshot preserves host payout, Sofra gross fee, partner commission, currency, take rate, and guest total as booked.
