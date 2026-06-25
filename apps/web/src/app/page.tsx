import { SUPPORTED_MARKET_KINDS } from "@worldcup-settlement/domain";
import { TXLINE_FREE_SERVICE_LEVELS } from "@worldcup-settlement/shared";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">WorldCup Settlement</p>
        <h1>Verifiable prediction settlement for World Cup markets.</h1>
        <p>
          This first shell proves the monorepo and app runtime. The next pass can
          connect the fixture board, market cards, and settlement receipt flow.
        </p>

        <div className="grid">
          <div className="metric">
            <strong>Markets</strong>
            <span>{SUPPORTED_MARKET_KINDS.length} deterministic templates</span>
          </div>
          <div className="metric">
            <strong>TxLINE free tiers</strong>
            <span>
              {TXLINE_FREE_SERVICE_LEVELS.delayed} delayed,{" "}
              {TXLINE_FREE_SERVICE_LEVELS.realtime} realtime
            </span>
          </div>
          <div className="metric">
            <strong>API routes</strong>
            <span>Server-side TxLINE credentials stay inside the app</span>
          </div>
        </div>
      </section>
    </main>
  );
}
