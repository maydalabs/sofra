# Security and privacy

## Public-safe boundary

Public page HTML, JSON, metadata, analytics, map inputs, storage metadata, and database views must exclude exact addresses, precise coordinates, arrival instructions, identity documents, private assessment notes, dietary data, guest identities, reports, and internal risk information.

`public.published_hosted_tables` is the intended anonymous-query boundary. Application projections repeat the allowlist so accidental schema expansion does not expand public output.

`get_my_booking_summaries()` is the authenticated traveler read boundary. It filters on `auth.uid()` and returns only booking status, party context, public table information, compatibility status, payment status, and total price. It cannot return address, arrival, guest-name, dietary-text, assessment, incident, or audit fields.

`get_my_host_roster(table_id)` is the serving-host read boundary. It verifies that the authenticated actor owns the table’s household and returns only confirmed/completed booking identifiers, party size, booking status, and compatibility outcome. Hosts do not receive direct access to the broader booking row, guest names, dietary text, payment detail, or traveler-selection attributes.

Booking preparation separates the server-only intent from the traveler-facing review. The intent may hold additional-guest names and a private dietary disclosure for future dedicated persistence; the review allowlist contains only party size, total price, compatibility status, and pre-payment booking status. Sensitive form content is never echoed into the page result.

Post-dinner submission repeats this separation for each trust channel. Public review text remains moderation-pending. Private constructive text and confidential safety reports exist only in their server-side intent and are absent from the safe result, redirect URL, demo audit, and analytics contract. The safety result contains only incident state and the required payout state; it never contains severity or report text.

## Data separation

- Public approximate neighborhood and deliberately coarse coordinates live with the listing.
- Verified private address and precise coordinates live in a private table.
- Arrival instructions are separately access-controlled and disclosed only to eligible confirmed travelers and the serving host.
- Dietary disclosures, safety incidents, and assessments have dedicated restrictive policies.
- Public reviews, private feedback, and safety reports never share a combined storage or rendering projection.

## Authorization

- Anonymous users read only published public views.
- Travelers read their own bookings, guests, and disclosures.
- Hosts read their household and tables, plus the minimum delivery information for confirmed/completed bookings through the narrow roster function.
- Operator and administrator operations execute server-side with explicit role checks and audit entries.
- Role assignment is server controlled and cannot derive from client-editable auth metadata.

The operator read repository checks the server-resolved actor before a service-role client can be created, then checks again at every repository entry point. Host applications, table review, booking operations, incidents, payouts, and audit records have dedicated server-only contracts with purpose-specific allowlists. Confidential incident text is available only in the incident contract; address, precise location, dietary disclosure, and guest-name fields are absent from unrelated operator records.

## Secrets and telemetry

Only public map and public analytics identifiers may use `NEXT_PUBLIC_`. The database URL, `BETTER_AUTH_SECRET`, Resend, Sentry, and payment credentials remain server-only. Typed analytics events contain identifiers and non-sensitive product state only; dietary text, address data, guest names, incident content, and secrets are excluded by contract.
