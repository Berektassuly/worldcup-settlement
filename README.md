# WorldCup Settlement

A World Cup prediction demo where every mock payout has a readable receipt: score source, deterministic rule, TxLINE validation payload, proof status, and mock ledger movement.

## What It Does

- Shows World Cup soccer fixtures from TxLINE when credentials are configured.
- Falls back to replay data when TxLINE credentials or live match data are unavailable.
- Generates soccer-only prediction markets:
  - Participant 1 wins
  - Participant 2 wins
  - Draw
  - Total goals over/under 2.5
  - Participant team totals over/under 0.5 or 1.5
- Resolves markets with deterministic integer-safe rules.
- Lets users place mock point positions and settle them into receipts.
- Fetches `GET /api/scores/stat-validation` proof payloads when available.
- Normalizes proof hashes into 32-byte arrays and prepares Anchor-style `validateStat` inputs.

This is a demo product using mock points only. It does not use the TxLINE token for wagers and does not sign or send Solana transactions.

## Repo Structure

```text
apps/web                  Next.js app and API routes
packages/domain           Pure market templates and resolution logic
packages/shared           Zod schemas, constants, and shared wire types
packages/txline-client    TxLINE REST and SSE client
packages/settlement       Receipts, proof normalization, predicate evaluation
packages/solana-adapter   TxLINE program IDs and Anchor validation boundary
docs                      Architecture, integration, demo, submission notes
```

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://127.0.0.1:3000`.

Replay mode works without TxLINE credentials. To use live TxLINE data, fill in:

```text
TXLINE_BASE_URL="https://txline.txodds.com"
TXLINE_NETWORK="mainnet"
TXLINE_JWT=""
TXLINE_API_TOKEN=""
TXLINE_FIXTURE_LIMIT="8"
```

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Key Docs

- `docs/architecture.md`
- `docs/txline-integration.md`
- `docs/demo-plan.md`
- `docs/submission.md`
