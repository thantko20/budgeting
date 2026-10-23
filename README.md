# budgeting

A small monthly budget. Transactions are stored as integer minor units, dated as civil dates, and totaled for the month in Asia/Yangon. The default currency is MMK (one stored unit is one kyat). Accounts can be cash, a bank, a digital wallet, a credit card, or other. Transfers between accounts in the same currency move balances and are left out of income and expenses. Credit cards count as debt, not available money.

## Stack

- TanStack Start, React, and Tailwind in `apps/web`
- Shared ledger and Postgres-dialect SQL in `packages/ledger`
- Local database is [PGlite](https://pglite.dev) (Postgres in WASM) in `apps/web/data`, so nothing else has to be installed. The same SQL can move to hosted Postgres on Render later.
- `apps/docs` is the original Starlight starter and is not part of `bun dev`, `bun run build`, `bun run test`, or `bun run check-types`.

## Requirements

Node.js 24. The repo pins that in `.nvmrc` and `package.json` `engines`. Dependencies install with Bun 1.2.18.

## Run locally

```bash
bun install
bun dev
```

Open http://localhost:3001. The first launch creates `apps/web/data` and seeds a Cash account (MMK) plus a few categories. The overview is a dashboard; transactions, accounts, and categories are in the sidebar.

Other checks:

```bash
bun run check
bun run check-types
bun run test
bun run build
```

Production preview, after a build:

```bash
bun run build
bun run --filter web start
```
