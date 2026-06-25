# TxLINE Integration

This repository uses TxLINE as the primary data source for World Cup fixtures, odds, scores, streams, and score validation proofs.

## Public Endpoints

The MVP should use these published endpoints:

- `POST /auth/guest/start`
- `POST /api/token/activate`
- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/odds/updates/{fixtureId}`
- `GET /api/odds/updates/{epochDay}/{hourOfDay}/{interval}`
- `GET /api/odds/stream`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/scores/updates/{fixtureId}`
- `GET /api/scores/updates/{epochDay}/{hourOfDay}/{interval}`
- `GET /api/scores/historical/{fixtureId}`
- `GET /api/scores/stream`
- `GET /api/scores/stat-validation`

Do not rely on unpublished `/api/trading/*` endpoints. The app should own its own market and settlement demo flow.

## Credentials

Data calls require both:

- `Authorization: Bearer <guest JWT>`
- `X-Api-Token: <activated API token>`

For local development, set these in `.env.local` using the keys shown in `.env.example`.

## Free World Cup Tiers

- Service level `1`: World Cup and International Friendlies with 60 second delay.
- Service level `12`: World Cup and International Friendlies realtime.

The TxLINE token is only for data authorization. User stakes or demo settlement funds must use mock points or a separate demo asset.

## SSE Handling

SSE messages can be split across network chunks. The parser in `packages/txline-client` buffers chunks until a full blank-line-delimited SSE block is available, preserves multiline `data:` fields, ignores comments, and handles heartbeat events.

## Score Validation

The first proof target is `GET /api/scores/stat-validation` with:

- `fixtureId`
- `seq`
- `statKey`
- optional `statKey2`

Soccer full-game stat keys:

- `1`: participant 1 goals
- `2`: participant 2 goals
- `3`: participant 1 yellow cards
- `4`: participant 2 yellow cards
- `5`: participant 1 red cards
- `6`: participant 2 red cards
- `7`: participant 1 corners
- `8`: participant 2 corners

The settlement package normalizes proof hashes to 32 byte arrays before any Solana validation call.

## Demo Data Route

The web app uses `GET /api/demo/fixtures` for the Phase 3 demo flow.

- If `TXLINE_JWT` and `TXLINE_API_TOKEN` are set, the route loads TxLINE fixtures, score snapshots, and odds snapshots.
- If credentials are missing or TxLINE is unavailable, the route returns replay fixtures and marks the response as `mode: "replay"`.
- The UI displays the active mode clearly so judges can tell whether they are seeing live TxLINE-backed data or replay data.

## Market Rule Mapping

The domain package maps soccer markets to TxLINE full-game stat keys:

- Participant 1 wins: stat `1 - 2 > 0`
- Participant 2 wins: stat `2 - 1 > 0`
- Draw: stat `1 - 2 == 0`
- Total goals over `2.5`: stat `1 + 2 > 2`
- Total goals under `2.5`: stat `1 + 2 < 3`
- Team total over `0.5`: team goals `> 0`
- Team total under `0.5`: team goals `< 1`
- Team total over `1.5`: team goals `> 1`
- Team total under `1.5`: team goals `< 2`

The UI uses half-goal lines, but proof predicates stay integer-safe because soccer goals are integers.
