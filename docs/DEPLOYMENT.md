# Deployment

Deploying makes the application reachable. It does not make it launchable — see
"What deploying does not solve" at the end.

## Order of operations

Migrations must be applied **before** the code that depends on them serves
traffic. Deploy in this order, every time:

```bash
pnpm db:migrate:neon   # 1. apply pending migrations to the deployed database
git push origin main   # 2. deploy the code that expects them
curl https://YOUR-DOMAIN/api/health   # 3. confirm
```

The health check answers the question that matters after a deploy:

```json
{ "status": "ok", "migrations": 9, "latestMigration": "0009_rate_limit.sql" }
```

If `latestMigration` is older than the newest file in `db/migrations`, the code
shipped and the migration did not. Run step 1 and redeploy.

Migrations are deliberately **not** part of the build. A Vercel preview build
runs on every branch, and a build-step migration would let any branch mutate the
production schema.

## Vercel environment variables

Set these in the Vercel project, for Production. You must enter them yourself —
they are secrets.

| Variable                                              | Value                     | Notes                                                                                                  |
| ----------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                        | Neon **pooled** string    | The one with `-pooler` in the host. Serverless functions exhaust direct connections quickly.           |
| `BETTER_AUTH_SECRET`                                  | `openssl rand -base64 32` | Signs session tokens. Changing it signs everyone out.                                                  |
| `NEXT_PUBLIC_APP_URL`                                 | `https://your-domain`     | Must be https.                                                                                         |
| `SOFRA_DEMO_MODE`                                     | `false`                   | Anything else is refused at boot.                                                                      |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                 | from Resend               | Without these, sign-in links are logged to the server console instead of emailed — nobody can sign in. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                | optional                  | Monitoring is disabled cleanly without them.                                                           |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | optional                  | Analytics no-ops without them.                                                                         |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`                     | optional                  | Falls back to a neighbourhood label.                                                                   |

`DATABASE_URL_UNPOOLED` is **not** needed in Vercel. It is only for running
migrations from a workstation.

### `NEXT_PUBLIC_` values are inlined at build time

This trips people up. A `NEXT_PUBLIC_*` variable set only in the runtime
environment has no effect — its value is baked in when `next build` runs. Vercel
provides environment variables at build time, so setting them in the project
settings is sufficient; setting them anywhere later is not.

## Startup validation

The application refuses to boot if production is misconfigured:

```
Refusing to start: the production environment is incomplete.
  - BETTER_AUTH_SECRET: session tokens would not be signed with a stable key
```

This is intentional. A missing `DATABASE_URL` would otherwise make the site
serve fictional demo households as though they were real listings, which is
worse than an outage. See `src/server/config/environment.ts`.

## Before the first deploy

- [ ] **Rotate the Neon database password.** The current one was pasted into a
      chat transcript. Neon → project → Roles → `neondb_owner` → Reset password,
      then update `.env.neon`.
- [ ] **Review history retention in Neon.** The free plan keeps roughly 6 hours
      of point-in-time recovery. For a service holding bookings and payouts,
      decide deliberately whether that is enough before taking real data.
- [ ] **Configure Resend.** Without it nobody can sign in — magic links go to the
      server console.
- [ ] Confirm `pnpm db:migrate:neon` reports `up to date`.
- [ ] Confirm the CI gate is green on `main`.

## Rolling back

Code rolls back through Vercel's deployment history. **Migrations do not.**
There are no down-migrations by design: a reversible migration that drops a
column still loses the data in it.

To recover from a bad migration, restore the database to a point in time in
Neon, then redeploy the matching commit. This is why history retention is worth
deciding on before launch, not after.

## What deploying does not solve

The application will be reachable and correct. It will not be a functioning
marketplace, because:

- **The deployed database has no content.** Only reference data — roles and one
  pricing policy. Development fixtures are fictional people and refuse to apply
  to a non-local database, correctly. Real listings require real hosts applying
  and a real operator approving them.
- **There is no payment provider.** Bookings persist as `draft` /
  `payment_not_started` and say so honestly. No money moves. The refund policy
  is decided and enforced (100% before cutoff / 50% after / 0% no-show / 100%
  when the platform cancels), so refund obligations are recorded -- executing
  them awaits the provider.

These are tracked in `docs/OPEN_QUESTIONS.md`. A deploy now is useful for
staging, demos, and validating the infrastructure — not for taking real
bookings.
