# Architecture

## Shape

Sofra is a modular monolith: one Next.js App Router application and one PostgreSQL database. Route groups organize public, account, host, partner, and admin surfaces. Product logic lives in typed domain modules and server services rather than page components.

```text
Browser
  → Next.js Server Components / Server Actions
    → authorization + domain services + audit
      → repository boundary
        → Supabase PostgreSQL / Auth / Storage
```

In demo mode, public reads use fictional in-repository fixtures. Demo mutations execute domain validation and return safe simulated results without claiming durable production state.

Traveler booking preparation runs through the server-only booking service. It validates the booking cutoff, configurable shared-party limit, seat availability, additional-guest count, compatibility requirement, and integer total before reaching the payment adapter. The service keeps private guest names and dietary text in the server intent while exposing a separate allowlisted pre-payment review.

Post-dinner input uses three distinct server-only intents: moderation-pending public review, operations-only constructive feedback, and restricted safety incident. Each exposes a separate safe result projection. Private feedback and confidential report text are never echoed, audited, or represented by analytics events. An open safety intent invokes the payout rule and requires `held`, but local demo review does not claim a durable incident or payout change.

## Layers

- `src/app`: routing, metadata, localized layouts, and page composition.
- `src/components`: shared visual building blocks and shadcn-owned components.
- `src/features`: domain types, policies, schemas, projections, demo repositories, and feature components.
- `src/server`: authentication, authorization, database clients, service boundaries, adapters, and audit.
- `src/server/repositories`: actor-bound read contracts, explicit row mappers, and demo/Supabase implementations. Page components depend on these contracts rather than database clients.
- `supabase/migrations`: normalized schema, views, functions, and RLS policies.
- `supabase/seed.sql`: fictional development data only.

## External adapters

- Supabase: browser/server clients and a demo repository fallback.
- Maps: approximate-neighborhood model; exact address is not accepted by the public adapter.
- Notifications: Resend when configured, console adapter in development.
- Analytics: typed PostHog events when configured, otherwise no-op; sensitive fields are unrepresentable in the event contract.
- Monitoring: Sentry when configured, otherwise disabled.
- Payments: provider-neutral server-only interface; guarded mock for local/test only.

## Service-role operations

Certification, role assignment, approval, audit inspection, incident handling, payout controls, and selected cross-user operational reads may use a server-only service-role connection. The key is read only in server-only modules and never uses a `NEXT_PUBLIC_` name.

Cross-user operator reads use a separate `SofraOperatorReadRepository`. Its factory resolves the current actor and requires the `operator` or `administrator` role before reading service-role configuration or constructing a privileged client. Repository methods repeat the authorization check, and gateway queries select only the fields required by the protected screen.

## Repository selection

- Anonymous listing reads use `published_hosted_tables` through an anonymous Supabase client when public credentials are configured. Without them, the existing fictional public projection remains available.
- Traveler-owned booking summaries use the authenticated `get_my_booking_summaries()` read model. It filters by `auth.uid()` inside a security-definer function with an empty search path and an explicit safe return shape.
- Host table reads use the authenticated server client and existing household-owner RLS. The repository maps an allowlist that excludes address IDs, exact addresses, precise coordinates, arrival instructions, and guest-selection data.
- Host certification reads select only status, validity, and certified capacity for actor-owned households. The create-table interface derives its capacity from that record instead of a UI default.
- Serving-host rosters use the authenticated `get_my_host_roster(table_id)` read model. It verifies household ownership in SQL and returns only confirmed/completed booking identifiers, party size, lifecycle status, and compatibility outcome. Direct serving-host reads of the wider booking row are not granted.
- Operator queues use fictional protected records in local demo mode. Outside demo mode they fail closed unless an authorized operator has server-only Supabase service-role configuration. Operator records are separate from public, traveler, and host contracts so confidential incident and audit fields cannot drift into those projections.
- Protected production reads never fall back to a demo actor. Missing authentication or Supabase configuration fails closed.
