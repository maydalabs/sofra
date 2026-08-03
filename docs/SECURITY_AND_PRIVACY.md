# Security and privacy

## Public-safe boundary

Public page HTML, JSON, metadata, analytics, map inputs, storage metadata, and Supabase views must exclude exact addresses, precise coordinates, arrival instructions, identity documents, private assessment notes, dietary data, guest identities, reports, and internal risk information.

`public.published_hosted_tables` is the intended anonymous-query boundary. Application projections repeat the allowlist so accidental schema expansion does not expand public output.

## Data separation

- Public approximate neighborhood and deliberately coarse coordinates live with the listing.
- Verified private address and precise coordinates live in a private table.
- Arrival instructions are separately access-controlled and disclosed only to eligible confirmed travelers and the serving host.
- Dietary disclosures, safety incidents, and assessments have dedicated restrictive policies.

## Authorization

- Anonymous users read only published public views.
- Travelers read their own bookings, guests, and disclosures.
- Hosts read their household and tables, plus the minimum delivery information for confirmed/locked bookings.
- Operator and administrator operations execute server-side with explicit role checks and audit entries.
- Role assignment is server controlled and cannot derive from client-editable auth metadata.

## Secrets and telemetry

Only publishable Supabase, public map, and public analytics identifiers may use `NEXT_PUBLIC_`. Service-role, Resend, Sentry, and payment credentials remain server-only. Typed analytics events contain identifiers and non-sensitive product state only; dietary text, address data, guest names, incident content, and secrets are excluded by contract.

