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

## Phase 1 Demo State

This pass only proves the monorepo, package boundaries, TxLINE client skeleton, SSE parser, schemas, and minimal app runtime. The full fixture board and receipt UI belong to the next implementation phase.
