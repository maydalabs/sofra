# Sofra — Phase 1 product foundation

Sofra is a Türkiye-first managed marketplace where travelers reserve seats at scheduled dinners inside verified Turkish households.

> Be welcomed into a Turkish household and join the table.

This repository is the Phase 1 modular monolith. It includes localized public discovery, demo-safe traveler/host/operator/partner workspaces, a normalized Supabase schema with RLS, server-side domain rules, provider adapters, fictional development data, and automated coverage. It does not contain real payments or connected production services.

## Project

- Absolute path: `/Users/mehmeteminmayda/Projects/sofra`
- Runtime: current stable Next.js App Router and React, strict TypeScript
- Package manager: pnpm (lockfile committed)
- Styling: Tailwind CSS and owned shadcn/ui component source
- Data/auth/storage target: local or hosted Supabase PostgreSQL/Auth/Storage
- Localization: `next-intl` at `/en` and `/tr`

Product decisions are documented in `docs/PRODUCT_CONSTITUTION.md` and `docs/DECISIONS.md`. Read `AGENTS.md` before making product changes.

## Prerequisites

- Node.js 20 or newer (the current development machine uses Node 25)
- pnpm 11 or newer
- Optional for the local database: Docker Desktop and Supabase CLI
- Optional for browser tests: Playwright Chromium (`pnpm exec playwright install chromium`)

Docker and Supabase CLI were not installed on the initial development machine, so the checked-in read-only demo repository is the default.

## Install and run

```bash
cd /Users/mehmeteminmayda/Projects/sofra
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/en`. With `SOFRA_DEMO_MODE=true`, `/en/demo` sets a local-only HTTP-only persona cookie for traveler, certified-host, partner, or operator walkthroughs. `/en/demo/journey` connects qualification, publication, booking, hosting, feedback, safety intervention, payout holds, and audit into one guided read-only walkthrough. The persona mechanism is rejected in production.

## Environment

Copy `.env.example` and supply only the services you are using:

- `NEXT_PUBLIC_APP_URL`
- `SOFRA_DEMO_MODE`
- `SOFRA_ALLOW_INDEXING` (safe default: `false`; `true` requires a trusted HTTPS app URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SOFRA_ENABLE_MOCK_PAYMENTS` (local/test only; rejected in production)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`

Never commit `.env.local`. The service-role key is never imported from a client module.

## Local Supabase

When Docker and Supabase CLI are available:

```bash
pnpm db:start
pnpm db:reset
pnpm db:types
```

- Foundation migration: `supabase/migrations/202608030001_initial_foundation.sql`
- Authenticated read-model migration: `supabase/migrations/202608240001_repository_read_models.sql`
- Host operations read-model migration: `supabase/migrations/202608240002_host_operations_read_models.sql`
- Partner referral read-model migration: `supabase/migrations/202608240003_partner_referral_read_models.sql`
- Fictional seed: `supabase/seed.sql`
- Generated-shape fallback types: `src/server/database/database.types.ts`

`db:types` regenerates types from the local database. The SQL seed contains no real people or real private addresses. The TypeScript demo fixture materializes the same product states relative to the current date so public and portal pages remain useful without Supabase.

## Quality commands

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Playwright starts the app on an isolated test port and covers anonymous discovery, table detail, honest payment-disabled checkout and its safe review, traveler booking progress and cancellation review, host draft rules/submission, operator approval, public address privacy, localized canonical and structured metadata, crawler restrictions, cross-role access rejection, keyboard skip navigation, active portal navigation, English and Turkish protected-form localization, keyboard-readable read-only previews, the guided cross-role journey, roster privacy, post-dinner moderation/privacy boundaries, confidential-report non-echo, payout holds, and partner-owned referral visibility.

## Architecture

- `src/app/[locale]`: localized public and role-specific routes
- `src/features`: pricing, policy, scheduled tables, bookings, dietary privacy, partner referral projections, and payout rules
- `src/server`: auth, authorization, Supabase clients, services, payments, maps, notifications, analytics, monitoring, and audit
- `src/server/repositories`: typed public, traveler, host, partner, and protected operator read contracts with demo and Supabase implementations
- `messages`: English and Turkish interface messages
- `supabase`: local configuration, SQL migration, RLS, public-safe view, and fictional seed
- `docs`: product constitution, decisions, open questions, architecture, domain, states, privacy, and plan

Status changes run through typed services and illegal transitions return domain errors. Public listings use an explicit allowlist projection and `published_hosted_tables`; exact address, precise coordinates, arrival instructions, dietary details, private guest names, assessment notes, and incident content are excluded.

The traveler booking service validates availability, cutoff, configurable shared-party limits, exact additional-guest counts, compatibility requirements, and integer totals. A separate safe review omits guest names and dietary text. Booking details visualize compatibility, payment, table confirmation, and dinner as distinct states. Local cancellation review validates the lifecycle transition without changing durable data or deciding the still-open refund policy.

Completed bookings expose three separate post-dinner channels: a moderation-pending public review, operations-only constructive feedback, and a restricted safety report. The server reloads the traveler-owned completed booking before validating any channel. Private and safety text never appears in the result, URL, demo audit, or analytics; an open safety intent requires the linked payout state to be held. Local review is deliberately non-durable, and production fails honestly until the transactional write boundary is connected.

The host workspace derives certified capacity from the actor-owned certification record, visualizes the table journey from private draft through dinner, and calculates confirmed-party and projected host-net summaries from the delivery roster. Local submission review reloads the host-owned table and active certification before validating the transition, but does not claim a durable write. Host rosters use a narrow authenticated SQL function and never expose guest names, dietary text, exact location, payment detail, or appearance-selection data.

The partner workspace replaces hard-coded referral metrics with an actor-owned conversion projection: landing recorded, booking attributed, dinner completed, or booking closed. Its authenticated SQL function returns only organization identity, referral stage, party count, and public table context. Traveler identity, attribution metadata, private location, dietary data, payment details, commissions, and settlement data are excluded. The final attribution window, economics, and settlement remain open product decisions.

Shared launch-readiness components provide a keyboard skip link, localized loading/error/empty states, content-level language metadata, and active-section announcements in horizontally scrollable portal navigation. Empty traveler, host, partner, and operator queues now explain what happens next instead of rendering blank cards. Every protected page repeats its portal authorization gate before content or data access so parallel rendering cannot attempt a protected read for the wrong role.

Protected account, household, address, assessment, pricing, booking, incident, and audit interfaces now localize their operational labels in English and Turkish. Preview-only profile, address, assessment, and policy fields are explicitly read-only and paired with visible explanations; unavailable buttons no longer imply that a durable write can occur.

Public pages provide localized canonical links, language alternates, social metadata, and table-specific structured event data built only from the approved public projection. Independently shared table pages deliberately clear the site-wide social image because no table-specific public image exists. Protected and form routes send crawler-level `noindex` headers, while `robots.txt` and the public sitemap remain closed unless `SOFRA_ALLOW_INDEXING=true` is paired with a trusted HTTPS app URL. Only messages needed by interactive client components are serialized to the browser.

Public, traveler, host, partner, and operator page components covered by the current contracts read through repository queries rather than importing database clients or fictional fixtures. Anonymous discovery uses the public-safe view when Supabase is configured and retains the fictional public fallback otherwise. Protected repositories use local personas only in demo mode and fail closed when production credentials or an authorized actor are absent. Cross-user operator reads use a dedicated server-only repository that checks the actor role before creating a service-role client and exposes purpose-specific records for applications, table reviews, booking operations, incidents, payouts, and audit events.

## Adapters and local fallbacks

- Maps: approximate-neighborhood fallback unless a public key is configured; exact addresses are not accepted by the public model.
- Notifications: Resend when configured, development console adapter otherwise.
- Analytics: typed non-sensitive events and no-op behavior without PostHog.
- Monitoring: disabled cleanly without Sentry DSN.
- Payments: server-only provider interface. The mock is opt-in, deterministic, auditable, card-free, and impossible to construct in production. Without a real provider, checkout says payments are not enabled and never marks a booking paid.

## Intentional Phase 1 limits

- No real payment provider, payout release, tax logic, phone verification, or production identity verification
- No live chat, native apps, automated host/safety decisions, or AI recommendation system
- Demo mutations demonstrate validation, authorization, lifecycle, and audit boundaries; durable remote writes require local/hosted Supabase wiring
- Google Maps, Resend, PostHog, and Sentry are adapter-ready but optional
- Final brand, launch neighborhoods, commercial policy, cancellation policy, verification rubric, partner economics, and legal/compliance decisions remain open in `docs/OPEN_QUESTIONS.md`
