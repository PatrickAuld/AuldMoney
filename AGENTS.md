# AuldMoney Agent Guide

## Project

AuldMoney is a private, mobile-first family ledger deployed as a Cloudflare
Worker. Next.js runs through Vinext and the Cloudflare Vite plugin. D1 stores
parents, children, ledger entries, and interest settings.

There is one family. Every authorized parent can see and modify every child.

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm run build
npm run lint
npm run db:generate
npm run db:migrate:local
npm run db:migrate:remote
npm run deploy
```

Use Node.js 22.13 or newer. Deploy the generated Vinext configuration at
`dist/server/wrangler.json`; do not deploy `worker/index.ts` directly with a
plain `wrangler deploy` command.

## Architecture

- `app/`: Next.js App Router UI and route handlers.
- `app/lib/data.ts`: authorization, bootstrap, and dashboard queries.
- `db/schema.ts`: Drizzle schema.
- `drizzle/`: committed D1 migrations and metadata.
- `worker/index.ts`: Worker fetch and scheduled-event entry points.
- `worker/interest.ts`: scheduled interest posting.
- `wrangler.jsonc`: Worker bindings, D1 UUID, variables, and cron triggers.

The application is optimized for quick mobile use. Keep credit and debit
actions prominent and touch targets comfortably sized.

## Authentication and authorization

Cloudflare Access authenticates users. The Worker forwards the verified Access
identity as `Cf-Access-Authenticated-User-Email`. Never accept a client-provided
email as identity.

The `parents` table is a second authorization boundary. Every page or route
that reads or mutates family data must call `requireParent()` first.
`BOOTSTRAP_PARENT_EMAIL` may create the first parent only when the table is
empty. Do not broaden this bootstrap behavior.

## Ledger invariants

- Store money as signed integer cents. Never store floating-point currency.
- Credits are positive; debits are negative; balances may be negative.
- Ledger entries are immutable. Corrections are new compensating entries.
- Preserve `created_by_email`, `effective_at`, and comments for auditability.
- Do not add a family-total balance to the landing page.

## Interest invariants

- Rates are integer basis points and are limited to 0–10,000.
- Supported schedules are weekly, monthly, quarterly, and annually.
- The chart and scheduled postings must use the same nominal annual-rate
  calculation and compounding cadence.
- Scheduled interest is posted as ledger entries, including signed interest on
  negative balances.
- Cron processing must remain retry-safe. Interest ledger IDs are deterministic
  per child and due period.
- Changing a rate or schedule starts a new accrual period.

## Database changes

Change `db/schema.ts`, then run `npm run db:generate`. Commit the generated SQL,
snapshot, and journal changes. Apply migrations locally before considering the
change complete. Never edit an already-deployed migration.

The D1 database UUID in `wrangler.jsonc` is an identifier and is safe to commit.
Never commit API tokens, Access credentials, or secrets.

## Validation

For application changes, run:

```bash
npm run typecheck
npm run build
npx wrangler deploy --dry-run --config dist/server/wrangler.json
```

For schema changes, also run `npm run db:migrate:local`. Report existing lint
failures separately; do not hide them or expand an unrelated change merely to
silence them.
