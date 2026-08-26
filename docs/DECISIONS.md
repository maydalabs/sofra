# Decisions

These decisions are frozen for Phase 1 unless the product owner explicitly changes them.

## Product

- Türkiye-first managed marketplace for scheduled household dinners.
- Bookable inventory is a scheduled table, not a generic host profile.
- Host-selected menu with private compatibility disclosure; no à-la-carte or custom-menu flow.
- Meaningful verified-host participation is mandatory.
- Tea or Turkish coffee and conversation are central to the experience.
- Shared and private table formats are supported.
- No alcohol-related product fields, filters, pricing, or promotion.
- No selection of other guests by appearance or sensitive characteristics.
- Host-created, platform-approved publishing model.

## Commercial

- Host supplies desired net payout per traveler.
- Guest sees one all-inclusive price before checkout.
- Money is integer kuruş; pricing uses explicit integer rounding.
- Partner commission is modeled separately and paid from Sofra's fee.
- Payment provider remains undecided. Only a development/test mock exists in Phase 1.

## Technical

- One Next.js App Router application, React, strict TypeScript, pnpm, Tailwind CSS, and shadcn/ui.
- PostgreSQL (Neon in deployed environments, a local container in development)
  with plain SQL migrations, generated TypeScript types, and Better Auth.
  Superseded the original Supabase decision on 2026-08-26; object storage remains
  unchosen and unused.
- `next-intl`, Zod, React Hook Form, Vitest, Testing Library, and Playwright.
- Server Components by default, Node.js runtime by default, Server Actions for authenticated same-origin mutations.
- Database, maps, notifications, analytics, monitoring, and payments sit behind adapters.
- Demo mode is a read-only product fallback when no database is configured.
- No ORM, GraphQL, microservices, monorepo, vector database, or custom payment
  infrastructure. Data access is raw SQL through postgres.js.

## Development policy defaults

Defaults are hypotheses—not permanent decisions—and live in typed configuration or pricing-policy records:

- Minimum creation-to-dinner lead: 7 days
- Normal publishing horizon: 35 days
- Booking cutoff: 36 hours before dinner
- Roster lock: 24 hours before dinner
- Shared-table minimum: 2 travelers
- Shared booking party maximum: 2 travelers
- Take rate: 25% of guest total
- Currency: TRY
- New-host active-table limit: 2
- New-host weekly frequency limit: 2
