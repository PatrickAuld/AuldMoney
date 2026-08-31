# AuldMoney

A private, mobile-first family ledger built for Cloudflare Workers and D1.

## Product model

- Parent accounts authenticate with ChatGPT sign-in and are authorized by email.
- The first authenticated user bootstraps the family and becomes the first parent.
- Parents can add other parent emails; all parents can see and update every child.
- Every credit or debit is an immutable signed ledger entry. Balances may be negative.
- Each child has an annual rate and payment cadence used for the ten-year projection.
- Interest projections do not silently mutate ledger principal.

## Local development

```bash
npm run install:ci
npm run db:generate
npm run dev
```

The production D1 schema is generated into `drizzle/`. Runtime bindings are declared in `.openai/hosting.json`.

## Validation

```bash
npm exec tsc -- --noEmit
npm run build
```
