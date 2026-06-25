# WorldCup Settlement Architecture

WorldCup Settlement is a TxLINE-powered soccer prediction demo where every mock payout has a readable receipt: fixture, rule, score source, proof payload, and settlement movement.

## Package Boundaries

- `apps/web` owns the Next.js app, route handlers, server-side environment access, replay data, and the demo UI.
- `packages/domain` owns pure soccer market templates and deterministic resolution. It does not import TxLINE, Solana, React, Next.js, wallet adapters, or framework code.
- `packages/shared` owns Zod schemas, constants, and wire types shared across packages.
- `packages/txline-client` owns TxLINE REST and SSE access.
- `packages/settlement` owns receipt models, proof normalization, byte validation, and deterministic predicate evaluation.
- `packages/solana-adapter` owns the TxLINE program boundary: program IDs, PDA seed metadata, and Anchor-ready `validateStat` argument shaping.

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

## Runtime Shape

1. `GET /api/demo/fixtures` attempts TxLINE fixtures, score snapshots, and odds snapshots when `TXLINE_JWT` and `TXLINE_API_TOKEN` are configured.
2. If live data is unavailable, the route returns replay fixtures with a visible replay mode banner.
3. The UI creates soccer markets from `packages/domain`, shows current would-resolve-now states, and records mock point positions locally.
4. Settling a position creates a receipt and calls `GET /api/demo/proof`.
5. `GET /api/demo/proof` attempts TxLINE `GET /api/scores/stat-validation` using the receipt fixture, sequence, stat keys, and predicate.
6. If live proof data is unavailable, the route returns a deterministic replay proof fixture with the same normalized shape.
7. The settlement package converts hash strings or byte arrays into checked 32-byte arrays and evaluates the requested predicate against the proof stats.
8. The Solana adapter prepares Anchor-style `validateStat` inputs and daily score root PDA seed bytes. It does not sign or send transactions.

## Current Settlement Scope

- Assets are mock points in the browser UI.
- The TxLINE token is only used for data authorization and is never treated as a user wager asset.
- No Anchor escrow program is included yet.
- No transactions are signed or sent by this MVP.

## Later Work

- Add a durable receipt store if the demo needs persistence.
- Add real Anchor view-call execution for `validateStat` after wallet/RPC wiring is approved.
- Add a minimal devnet escrow only after proof validation is reliable.
