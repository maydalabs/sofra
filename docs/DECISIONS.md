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
- Payments (decided 2026-08-29; the provider comparison behind it is held
  privately):
  iyzico Pazaryeri sub-merchant split through a Turkish Limited Şirket. The
  traveller is charged in full at booking (pre-auth is capped at 25 days by BKM
  rules and cannot span the 35-day horizon); the host's share sits unapproved in
  the provider's pool until the 3rd business day after the dinner, then the
  provider pays the host's IBAN directly. Merchant-of-record is the documented
  fallback only. **Trigger on record:** if a host-approval step is ever added to
  booking, the charge must move to acceptance.
- No minimum-table guarantee at launch (decided 2026-08-29): a shared dinner
  that misses its minimum is decided at the booking cutoff and refunded 100%
  the same business day — the platform-cancellation tool. Covering a missing
  seat would cost roughly three times the platform fee per seat.
- Hosts are never paid before the dinner (decided 2026-08-29): paying before
  performance forfeits the 6502 md. 48/6(d) refund-liability carve-out and
  removes the only money lever during a safety incident. A safety hold on a
  payout carries a hard 14-calendar-day internal decision deadline.
- Cancellation and refund policy (decided 2026-08-29): 100% refund before the
  booking cutoff, 50% after it, nothing for a no-show. A dinner cancelled by
  the platform always refunds 100%. Of the retained portion on a partial
  refund, the host is compensated first up to their net; Sofra keeps only the
  remainder. Percentages are pricing-policy configuration; the structure is
  the decision. Refund rounding favours the traveller, as pricing rounding
  favours the host.
- Crypto payment rails are not a launch option pending legal verification:
  Türkiye has prohibited crypto as a means of payment since 2021, and the
  question is delegated to the payment-provider research. At most a
  post-launch secondary rail, never rail #1.

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
