# WorldCup Settlement Architecture

WorldCup Settlement is a small TxLINE-powered prediction settlement app. The MVP should feel like a simple soccer prediction product first, with proof and settlement details available when a market resolves.

## Boundaries

- `apps/web` owns the Next.js app, route handlers, server-side environment access, and the initial UI shell.
- `packages/domain` owns market terms, pure resolution contracts, and repository ports. It must not import TxLINE, Solana, React, or framework code.
- `packages/shared` owns common schemas, constants, and wire types shared across packages.
- `packages/txline-client` owns TxLINE REST and SSE access.
- `packages/settlement` owns proof normalization and receipt models.
- `packages/solana-adapter` owns Solana and TxLINE program integration boundaries. Phase 1 only defines constants and interfaces.

## Dependency Direction

```text
apps/web
  -> packages/domain
  -> packages/txline-client
  -> packages/settlement
  -> packages/solana-adapter

packages/domain -> packages/shared
packages/txline-client -> packages/shared
packages/settlement -> packages/domain, packages/shared
packages/solana-adapter -> packages/settlement, packages/shared
```

The domain package defines what the product needs. TxLINE and Solana packages provide adapters for those needs.

## Phase 1 Runtime Shape

1. The app stores TxLINE credentials in server-side environment variables.
2. API routes in `apps/web` call `packages/txline-client`.
3. The client validates fixture, odds, score, and proof payloads with shared Zod schemas.
4. The UI remains a minimal shell until fixture and receipt workflows are added.

## Phase 2-3 Runtime Shape

- `packages/domain` now exposes soccer-only market templates and deterministic resolution.
- `apps/web` exposes `/api/demo/fixtures`, which attempts TxLINE when credentials are configured and otherwise returns replay data.
- The demo UI shows a fixture board, market cards, mock points positions, would-resolve-now states, and a readable receipt.
- Receipts include the fixture, rule, score source, outcome, position side, ledger movement, and an expandable proof placeholder.

## Later Phases

- Add proof retrieval and validation using `GET /api/scores/stat-validation`.
- Add a durable receipt store if the demo needs persistence.
- Add Anchor or Solana client implementation in `packages/solana-adapter` after the data flow is reliable.
