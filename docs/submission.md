# Submission Notes

## Core Idea

WorldCup Settlement is a sports-first prediction demo where each settlement creates a clear receipt. The receipt shows the fixture, market rule, score source, TxLINE sequence, outcome, mock payout, proof payload status, and Anchor validation boundary.

## User Flow

1. Open the fixture board.
2. Select a World Cup fixture.
3. Review binary soccer markets.
4. Back YES or NO with mock points.
5. Settle the position.
6. Read the settlement receipt.
7. Expand proof details only when needed.

## TxLINE Endpoints Used

- `POST /auth/guest/start`
- `POST /api/token/activate`
- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/odds/stream`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/scores/updates/{fixtureId}`
- `GET /api/scores/stream`
- `GET /api/scores/stat-validation`

The app does not use undocumented `/api/trading/*` endpoints.

## Settlement And Proof Flow

1. Domain rules map each market to TxLINE soccer stat keys.
2. The receipt includes `fixtureId`, `seq`, `statKey`, optional `statKey2`, predicate, and operation.
3. `/api/demo/proof` requests `GET /api/scores/stat-validation` when TxLINE credentials are configured.
4. The proof payload is parsed with shared Zod schemas.
5. Hashes are normalized into checked 32-byte arrays.
6. The settlement package evaluates the predicate against the returned stat values.
7. The Solana adapter prepares Anchor-style `validateStat` arguments and daily score root PDA seed bytes.

This build does not execute the Anchor view call and does not include a custom escrow program.

## Replay Mode

Replay mode is enabled when credentials are missing, TxLINE is unavailable, or proof data cannot be retrieved for the selected sequence. It includes:

- Finished fixture for settlement receipts.
- Live fixture for would-resolve-now behavior.
- Upcoming fixture for pending states.
- Deterministic replay proof payloads that match the expected proof shape.

Replay mode is visible in the UI and in proof details.

## Demo Framing

- Mock points only.
- No real-money wagering.
- TxLINE token is only for data authorization.
- No user staking, transfers, or escrow assets are implemented.
- Any future escrow work should use devnet and a separate mock asset.

## Known Limitations And Risks

- Live proof retrieval requires exact TxLINE `fixtureId`, score `seq`, and soccer stat keys.
- Finished live World Cup matches may not be available during judging.
- Proof payloads can vary in hash encoding, so byte normalization must stay strict.
- The current build prepares Anchor validation input but does not run `validateStat` on-chain.
- Ledger state is browser-local and resets on page refresh.
- No wallet connection or durable receipt storage is included.

## TxLINE Feedback

- REST fixture, score, odds, and SSE surfaces are clear enough to wrap in a small client.
- The `stat-validation` endpoint is powerful but needs examples tied to soccer stat keys `1` and `2`.
- The docs and OpenAPI disagree on `eventStatsSubTreeRoot` versus `eventsSubTreeRoot`; accepting both avoids integration failures.
- It would help to document how to discover usable proof `seq` values from snapshots and historical scores.
- A small sample response for `GET /api/scores/stat-validation` would make Anchor integration faster.

## Video Script

Target: under 5 minutes.

1. Show the app and point out live TxLINE or replay mode.
2. Select the finished replay fixture.
3. Show the score and market cards.
4. Back a YES side with mock points.
5. Settle the position.
6. Read the receipt: fixture, rule, source, sequence, outcome, side, ledger movement.
7. Expand proof details and show endpoint, stat keys, predicate, proof source, Anchor program ID, and PDA seed metadata.
8. Explain that live TxLINE proof data is used when credentials and matching sequences are available; replay proof data keeps the submission reviewable.
9. Close with scope: proof boundary implemented, escrow intentionally deferred.
