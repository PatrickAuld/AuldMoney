# AuldMoney

A private, mobile-first family ledger running on Cloudflare Workers and D1.

## Architecture

- Vinext and the Cloudflare Vite plugin run the Next.js application in one Worker.
- D1 stores parents, children, immutable ledger entries, and interest settings.
- Cloudflare Access authenticates parents and supplies `Cf-Access-Authenticated-User-Email`.
- The D1 parent allowlist authorizes application access after authentication.
- A daily Worker cron posts due interest to each child’s ledger at the configured cadence.
- `patrick@patrickauld.com` is the only account allowed to bootstrap an empty database.

## One-time Cloudflare setup

Authenticate Wrangler, apply migrations, and add the bootstrap parent:

```bash
npx wrangler login
npm ci
npm run db:migrate:remote
npm run db:add-parent -- patrick@patrickauld.com
```

The D1 database already exists and its non-secret UUID is committed in
`wrangler.jsonc`. The add-parent command is idempotent, so it is safe to run
again.

### Login

In the Cloudflare dashboard, open **Workers & Pages → auldmoney → Access** and
protect both production and previews. Create an **Allow** policy whose email is
`patrick@patrickauld.com`. Enable **One-time PIN** as the identity provider if
you do not already use Google or another provider. The Worker forwards the
verified Access identity into the app, and AuldMoney additionally checks the D1
parent allowlist.

Open <https://auldmoney.mandias.workers.dev>. Cloudflare will email the login
code. The app also bootstraps this email automatically when the parent table is
empty, so the explicit add-parent command above is defensive rather than
required.

## Development

```bash
npm ci
npm run db:migrate:local
npm run dev
```

Local development uses `patrick@patrickauld.com` as the authenticated parent.

## Deployment

Apply production migrations and deploy:

```bash
npm run deploy
```

The scheduled handler runs daily at `08:00 UTC`. It applies any weekly,
monthly, quarterly, or annual payment periods that became due since the last
successful run. Ledger IDs are deterministic, so retries cannot post the same
interest period twice.

For Workers Builds, use:

- Build command: `npm run build`
- Deploy command: `npm run db:migrate:remote && npm run deploy:built`

## Runtime secrets

AuldMoney currently requires no application runtime secrets. Add future secrets with `npx wrangler secret put NAME` or in the Worker dashboard under Settings → Variables & Secrets.
