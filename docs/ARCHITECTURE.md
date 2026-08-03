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

## Layers

- `src/app`: routing, metadata, localized layouts, and page composition.
- `src/components`: shared visual building blocks and shadcn-owned components.
- `src/features`: domain types, policies, schemas, projections, demo repositories, and feature components.
- `src/server`: authentication, authorization, database clients, service boundaries, adapters, and audit.
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
