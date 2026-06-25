# Demo Plan

The submission demo should show a sports product first and the proof layer second.

## Flow

1. Open the app and show World Cup fixtures loaded from TxLINE.
2. Select a fixture and view a small set of binary markets.
3. Place a demo position using mock points or mock USDC.
4. Show live or replayed score updates moving the market toward resolution.
5. Resolve the market with deterministic rules.
6. Open the receipt:
   - fixture
   - market rule
   - final score stat
   - TxLINE source event and sequence number
   - score validation proof
   - validation result or devnet settlement trace

## Review Safety

The app should support replaying saved TxLINE score sequences because judges may review when no relevant World Cup match is live.

## Current Demo State

The app now includes the Phase 3 fixture and market demo:

- Fixture board from `/api/demo/fixtures`
- Replay fallback when TxLINE credentials are missing
- Deterministic soccer market cards
- Mock points ledger
- Simulated positions
- Would-resolve-now market states
- Settlement receipt with source, rule, outcome, side, ledger movement, and advanced proof placeholder

The next implementation pass should turn the proof placeholder into a real `/api/scores/stat-validation` fetch and validation flow.
