# AuldMoney

A private, mobile-first family ledger running on Cloudflare Workers and D1.

## Architecture

- Vinext and the Cloudflare Vite plugin run the Next.js application in one Worker.
- D1 stores parents, children, immutable ledger entries, and interest settings.
- Cloudflare Access authenticates parents and supplies `Cf-Access-Authenticated-User-Email`.
- The D1 parent allowlist authorizes application access after authentication.
- `patrick@patrickauld.com` is the only account allowed to bootstrap an empty database.

## One-time Cloudflare setup

Authenticate Wrangler, then create the database:

```bash
npx wrangler login
npm run db:create
```

The database UUID is not a secret. `scripts/resolve-d1.mjs` discovers it by name during authenticated Cloudflare builds and replaces the inert UUID in `wrangler.jsonc` before deployment.

Create a Cloudflare Access self-hosted application for the Worker hostname. Configure an identity provider such as One-time PIN or Google, and use an Access policy that permits authentication. AuldMoney performs the final parent-email authorization itself.

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

For Workers Builds, use:

- Build command: `npm run build`
- Deploy command: `npm run db:migrate:remote && npx wrangler deploy`

The build resolves the D1 UUID using the API token Cloudflare creates for Workers Builds. If you prefer explicit configuration, add `D1_DATABASE_ID` as a build variable, not a secret.

## Runtime secrets

AuldMoney currently requires no application runtime secrets. Add future secrets with `npx wrangler secret put NAME` or in the Worker dashboard under Settings → Variables & Secrets.
