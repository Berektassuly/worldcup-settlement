# Demo Plan

The submission demo should show a sports product first and the proof layer second.

## Flow

1. Open the app and show World Cup fixtures loaded from TxLINE or replay mode.
2. Select a fixture and view a small set of binary markets.
3. Place a demo position using mock points.
4. Show live or replayed score updates moving the market toward resolution.
5. Resolve the market with deterministic rules.
6. Open the receipt:
   - fixture
   - market rule
   - final score stat
   - TxLINE source event and sequence number
   - score validation proof
   - validation result and prepared Anchor boundary data

## Review Safety

The app should support replaying saved TxLINE score sequences because judges may review when no relevant World Cup match is live.

## Current Demo State

The app now includes the controlled Phase 4-5 demo:

- Fixture board from `/api/demo/fixtures`
- Replay fallback when TxLINE credentials are missing
- Deterministic soccer market cards
- Mock points ledger
- Simulated positions
- Would-resolve-now market states
- Settlement receipt with source, rule, outcome, side, ledger movement, TxLINE sequence, proof status, and validation result
- Proof retrieval through `/api/demo/proof`
- Live TxLINE proof retrieval through `GET /api/scores/stat-validation` when credentials and proof data are available
- Deterministic replay proof fixture when live proof retrieval is unavailable
- Anchor-ready `validateStat` payload summary and raw proof details behind an expandable section

## Video Script Under 5 Minutes

1. Start at the fixture board and point out the data mode banner.
2. Select the finished replay fixture.
3. Open two or three market cards and show how the current score determines would-resolve-now states.
4. Back a YES or NO side with mock points.
5. Click Settle and read the receipt from top to bottom: fixture, rule, source, seq, outcome, position, ledger movement.
6. Open Advanced proof details and show the TxLINE `stat-validation` endpoint, stat keys, predicate, proof source, Anchor program boundary, and raw payload.
7. Explain that the same UI uses live TxLINE when credentials are configured and replay data otherwise.
8. Close with limitations: mock points only, no escrow program yet, no transaction signing in this build.
