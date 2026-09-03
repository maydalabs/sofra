# Sofra

**A Türkiye-first managed marketplace where travellers reserve a seat at a scheduled dinner inside a verified Turkish household.**

> Be welcomed into a Turkish household and join the table.

This repository is the Phase 1 modular monolith: localized public discovery,
traveller, host, partner, and operator workspaces, a normalized PostgreSQL
schema, server-side domain rules, provider adapters, fictional development
data, and automated coverage.

It is a working foundation, not a launched business. There is no real payment
provider, no production identity verification, and most durable writes are not
yet connected. The code says so everywhere it matters, and that is deliberate.

| | |
| --- | --- |
| Unit and integration tests | 220 |
| End-to-end scenarios | 27 |
| SQL migrations | 16 |
| Languages | English, Turkish |
| Stack | Next.js App Router, React, strict TypeScript, PostgreSQL 18, Tailwind |

## The two ideas worth reading the code for

**Privacy is a schema decision, not a UI decision.** Public listings are built
from an explicit allowlist projection. Exact address, precise coordinates,
arrival instructions, dietary details, private guest names, assessment notes,
and incident content cannot reach a public surface because the projection never
selects them. Host rosters go through a narrow authenticated SQL function that
returns no guest names, no dietary text, no exact location, and no payment
detail. Confidential safety reports never appear in a result, a URL, an audit
entry, or an analytics event.

**Unfinished things fail honestly.** Without a payment provider, checkout says
payments are not enabled and never marks a booking paid. The demo persona
mechanism is rejected in production. The fixture loader refuses a non-local
target. Protected repositories fail closed when credentials or an authorized
actor are absent. Nothing pretends to have succeeded.

## Where to look in this codebase

| Path | Why it is worth opening |
| --- | --- |
| `db/migrations/0003_functions.sql` | Triggers, the public projection, and the read models. The privacy boundary lives here rather than in a component. |
| `db/migrations/0004_bookings_write.sql` | Transactional booking and cancellation. |
| `src/server/repositories/` | Typed public, traveller, host, partner, and operator read contracts, each with a demo and a PostgreSQL implementation. |
| `src/server/authorization/` | The role checks every protected page repeats before content or data access, so parallel rendering cannot read for the wrong role. |
| `src/server/payments/` | A server-only provider interface whose mock is opt-in, deterministic, card-free, and impossible to construct in production. |
| `src/features/` | Pricing, policy, scheduled tables, bookings, dietary privacy, partner referral projections, and payout rules. |
| `e2e/sofra.spec.ts` | 27 scenarios including public address privacy, cross-role access rejection, confidential-report non-echo, roster privacy, and payout holds. |
| `db/migrate.mjs` | The migration runner. Plain `.sql` files in filename order, each in its own transaction, tracked in `public.schema_migrations`. No vendor CLI. |

## Stack

- Next.js App Router and React, strict TypeScript
- PostgreSQL 18: Neon when deployed, a local Docker container in development
- `postgres.js` with raw SQL, no ORM
- Better Auth with emailed sign-in links; no passwords stored
- `next-intl` at `/en` and `/tr`
- Tailwind CSS with owned shadcn/ui component source
- pnpm, lockfile committed

Product decisions are documented in `docs/PRODUCT_CONSTITUTION.md` and
`docs/DECISIONS.md`. Architecture detail is in `docs/ARCHITECTURE.md`, and the
privacy model in `docs/SECURITY_AND_PRIVACY.md`.

## Prerequisites

- Node.js 20 or newer
- pnpm 11 or newer
- Docker for the local database
- Optional for browser tests: `pnpm exec playwright install chromium`

Without a configured `DATABASE_URL`, anonymous discovery falls back to the
checked-in fictional demo data and authenticated access fails closed.

## Install and run

```bash
pnpm install
cp .env.example .env.local
pnpm db:up && pnpm db:reset && pnpm db:fixtures
pnpm dev
```

Open `http://localhost:3000/en`. With `SOFRA_DEMO_MODE=true`, `/en/demo` sets a
local-only HTTP-only persona cookie for traveller, certified-host, partner, or
operator walkthroughs, and `/en/demo/journey` connects qualification,
publication, booking, hosting, feedback, safety intervention, payout holds, and
audit into one guided read-only walkthrough.

## Database

```bash
pnpm db:up           # start the local PostgreSQL 18 container
pnpm db:migrate      # apply pending migrations
pnpm db:reset        # drop, re-apply every migration, re-seed reference data
pnpm db:fixtures     # load fictional development data (refuses non-local targets)
pnpm db:types        # regenerate database.types.ts from the live schema
pnpm db:migrate:neon # apply migrations to the deployed database
```

`.env.local` points at the local container so `pnpm dev` can never reach a
deployed database. Deployed credentials live in a separate, gitignored
`.env.neon` read only by `db:migrate:neon`.

Neither the reference seed nor the fixtures contain real people or real private
addresses. Fixture accounts use the reserved `.invalid` domain so they can never
resolve or receive mail.

## Quality commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test              # unit tests, no database required
pnpm test:integration  # runs against the local database
pnpm test:e2e
pnpm build
```

## Architecture

- `src/app/[locale]` localized public and role-specific routes
- `src/features` pricing, policy, scheduled tables, bookings, dietary privacy, partner referral projections, payout rules
- `src/server` auth, authorization, database client, services, payments, maps, notifications, analytics, monitoring, audit
- `src/server/repositories` typed read contracts with demo and PostgreSQL implementations
- `messages` English and Turkish interface messages
- `db` migrations, reference seed, development fixtures, migration runner, type generator
- `docs` product constitution, decisions, open questions, architecture, domain, states, privacy, plan

Status changes run through typed services, and illegal transitions return
domain errors rather than corrupting state.

The traveller booking service validates availability, cutoff, configurable
shared-party limits, exact additional-guest counts, compatibility requirements,
and integer totals. A separate safe review omits guest names and dietary text.
Booking detail treats compatibility, payment, table confirmation, and dinner as
distinct states.

Completed bookings expose three separate post-dinner channels: a
moderation-pending public review, operations-only constructive feedback, and a
restricted safety report. The server reloads the traveller-owned booking before
validating any channel, and an open safety intent requires the linked payout
state to be held.

The host workspace derives certified capacity from the actor-owned
certification record and calculates confirmed-party and projected host-net
summaries from the delivery roster. The partner workspace replaces hard-coded
referral metrics with an actor-owned conversion projection returning only
organization identity, referral stage, party count, and public table context.

Public pages provide localized canonical links, language alternates, social
metadata, and table-specific structured event data built only from the approved
public projection. Protected and form routes send crawler-level `noindex`
headers, and `robots.txt` and the public sitemap stay closed unless
`SOFRA_ALLOW_INDEXING=true` is paired with a trusted HTTPS app URL.

Accessibility is treated as part of the contract: a keyboard skip link,
localized loading, error, and empty states, field-linked validation errors
summarized after submission and announced to assistive technology, and
active-section announcements in horizontally scrollable portal navigation.

## Adapters and local fallbacks

- **Maps** approximate-neighbourhood fallback unless a public key is configured; exact addresses are not accepted by the public model
- **Notifications** Resend when configured, a development console adapter otherwise
- **Analytics** typed non-sensitive events, no-op without PostHog
- **Monitoring** disabled cleanly without a Sentry DSN
- **Payments** server-only provider interface; the mock is opt-in, deterministic, auditable, card-free, and impossible to construct in production

## Intentional Phase 1 limits

- No real payment provider, payout release, tax logic, phone verification, or production identity verification
- No live chat, native apps, automated host or safety decisions, or recommendation system
- Demo mutations demonstrate validation, authorization, lifecycle, and audit boundaries; most durable writes are not yet wired to the database
- Google Maps, Resend, PostHog, and Sentry are adapter-ready but optional
- Brand, launch neighbourhoods, commercial policy, cancellation policy, verification rubric, partner economics, and legal decisions remain open in `docs/OPEN_QUESTIONS.md`

## About

Built by [Mehmet E. Mayda](https://maydalabs.com/profile) at
[MaydaLabs](https://maydalabs.com).
[Read the work-in-progress case study](https://maydalabs.com/case-studies/sofra).

## License

Released under the [MIT License](LICENSE).
