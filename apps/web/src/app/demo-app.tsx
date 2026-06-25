"use client";

import {
  buildSoccerValidationPlan,
  createSoccerMarketTemplates,
  resolveSoccerMarket,
  type SoccerResolutionPreview
} from "@worldcup-settlement/domain";
import type { PredictionMarket, ResolutionSide } from "@worldcup-settlement/domain";
import { useEffect, useMemo, useState } from "react";
import type { DemoFixtureRecord, DemoFixturesResponse } from "@/lib/demo-types";

const startingPoints = 1000;
const stakePoints = 25;

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: DemoFixturesResponse };

type PositionSide = "yes" | "no";

type Position = {
  readonly id: string;
  readonly fixtureId: number;
  readonly marketId: string;
  readonly marketLabel: string;
  readonly side: PositionSide;
  readonly stake: number;
  readonly status: "open" | "settled";
  readonly payout?: number;
};

type Ledger = {
  readonly available: number;
  readonly locked: number;
  readonly settledPnl: number;
};

type Receipt = {
  readonly position: Position;
  readonly fixtureRecord: DemoFixtureRecord;
  readonly market: PredictionMarket;
  readonly resolution: SoccerResolutionPreview;
  readonly payout: number;
  readonly ledgerDelta: number;
  readonly status: "pending" | "void" | "settled";
};

export function DemoApp() {
  const [loadKey, setLoadKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [ledger, setLedger] = useState<Ledger>({
    available: startingPoints,
    locked: 0,
    settledPnl: 0
  });
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFixtures() {
      setLoadState({ status: "loading" });

      try {
        const response = await fetch("/api/demo/fixtures", {
          cache: "no-store",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Fixture request failed with HTTP ${response.status}`);
        }

        const data = (await response.json()) as DemoFixturesResponse;
        setLoadState({ status: "ready", data });
        setSelectedFixtureId((current) => current ?? data.fixtures[0]?.fixture.FixtureId ?? null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load fixtures."
          });
        }
      }
    }

    void loadFixtures();
    return () => controller.abort();
  }, [loadKey]);

  const selectedFixture =
    loadState.status === "ready"
      ? loadState.data.fixtures.find((record) => record.fixture.FixtureId === selectedFixtureId) ??
        loadState.data.fixtures[0] ??
        null
      : null;

  const markets = useMemo(
    () => (selectedFixture ? createSoccerMarketTemplates(selectedFixture.fixture) : []),
    [selectedFixture]
  );

  const resolutionByMarketId = useMemo(() => {
    if (!selectedFixture) {
      return new Map<string, SoccerResolutionPreview>();
    }

    const entries = markets.map(
      (market): [string, SoccerResolutionPreview] => [
        market.id,
        resolveSoccerMarket(market, selectedFixture.scoreline)
      ]
    );

    return new Map<string, SoccerResolutionPreview>(entries);
  }, [markets, selectedFixture]);

  const selectedPositions = positions.filter(
    (position) => position.fixtureId === selectedFixture?.fixture.FixtureId
  );

  function retry() {
    setLoadKey((key) => key + 1);
  }

  function placePosition(market: PredictionMarket, side: PositionSide) {
    if (!selectedFixture || ledger.available < stakePoints) {
      return;
    }

    const marketLabel = formatMarketLabel(market.rule.label, selectedFixture);
    const position: Position = {
      id: `${Date.now()}:${market.id}:${side}`,
      fixtureId: selectedFixture.fixture.FixtureId,
      marketId: market.id,
      marketLabel,
      side,
      stake: stakePoints,
      status: "open"
    };

    setPositions((current) => [position, ...current]);
    setLedger((current) => ({
      ...current,
      available: current.available - stakePoints,
      locked: current.locked + stakePoints
    }));
  }

  function settlePosition(position: Position) {
    if (!selectedFixture || position.status === "settled") {
      return;
    }

    const market = markets.find((candidate) => candidate.id === position.marketId);
    const resolution = market ? resolutionByMarketId.get(market.id) : null;

    if (!market || !resolution) {
      return;
    }

    const isPending = resolution.side === "pending";
    const isVoid = resolution.side === "void";
    const won = resolution.side === position.side;
    const payout = isPending ? 0 : isVoid ? position.stake : won ? position.stake * 2 : 0;
    const ledgerDelta = isPending ? 0 : payout - position.stake;

    const nextReceipt: Receipt = {
      position,
      fixtureRecord: selectedFixture,
      market,
      resolution,
      payout,
      ledgerDelta,
      status: isPending ? "pending" : isVoid ? "void" : "settled"
    };

    setReceipt(nextReceipt);

    if (isPending) {
      return;
    }

    setPositions((current) =>
      current.map((candidate) =>
        candidate.id === position.id
          ? {
              ...candidate,
              status: "settled",
              payout
            }
          : candidate
      )
    );
    setLedger((current) => ({
      available: current.available + payout,
      locked: current.locked - position.stake,
      settledPnl: current.settledPnl + ledgerDelta
    }));
  }

  return (
    <main>
      <section className="hero-band">
        <div className="page-shell hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">WorldCup Settlement</p>
            <h1>Prediction markets with receipts people can actually read.</h1>
            <p>
              Pick a World Cup fixture, take a side, and see how a market would
              settle from the current score. Replay mode keeps the demo available
              without live TxLINE credentials.
            </p>
          </div>
          <LedgerPanel ledger={ledger} />
        </div>
      </section>

      <section className="page-shell workspace">
        {loadState.status === "loading" ? (
          <LoadingState />
        ) : loadState.status === "error" ? (
          <ErrorState message={loadState.message} onRetry={retry} />
        ) : loadState.data.fixtures.length === 0 ? (
          <EmptyState onRetry={retry} />
        ) : (
          <>
            <div className="mode-banner" data-mode={loadState.data.mode}>
              <strong>{loadState.data.mode === "txline" ? "TxLINE data" : "Replay data"}</strong>
              <span>{loadState.data.reason}</span>
              <button type="button" onClick={retry}>
                Refresh
              </button>
            </div>

            <div className="demo-grid">
              <section className="fixture-column" aria-label="Fixtures">
                <SectionHeading
                  title="Fixtures"
                  detail={`${loadState.data.fixtures.length} available`}
                />
                <div className="fixture-list">
                  {loadState.data.fixtures.map((record) => (
                    <FixtureButton
                      key={record.fixture.FixtureId}
                      record={record}
                      selected={record.fixture.FixtureId === selectedFixture?.fixture.FixtureId}
                      onSelect={() => {
                        setSelectedFixtureId(record.fixture.FixtureId);
                        setReceipt(null);
                      }}
                    />
                  ))}
                </div>
              </section>

              <section className="market-column" aria-label="Markets">
                {selectedFixture ? (
                  <>
                    <FixtureHeader record={selectedFixture} />
                    <SectionHeading title="Markets" detail="Mock points only" />
                    <div className="market-grid">
                      {markets.map((market) => {
                        const resolution = resolutionByMarketId.get(market.id);
                        return (
                          <MarketCard
                            key={market.id}
                            market={market}
                            record={selectedFixture}
                            resolution={resolution ?? null}
                            canPlace={ledger.available >= stakePoints}
                            onPlace={placePosition}
                          />
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </section>

              <aside className="settlement-column" aria-label="Settlement">
                <PositionsPanel positions={selectedPositions} onSettle={settlePosition} />
                <ReceiptPanel receipt={receipt} />
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function LedgerPanel({ ledger }: { readonly ledger: Ledger }) {
  return (
    <div className="ledger-panel" aria-label="Mock points ledger">
      <span>Mock ledger</span>
      <strong>{ledger.available.toLocaleString()} pts</strong>
      <dl>
        <div>
          <dt>Locked</dt>
          <dd>{ledger.locked} pts</dd>
        </div>
        <div>
          <dt>Settled P/L</dt>
          <dd>{formatSigned(ledger.settledPnl)} pts</dd>
        </div>
      </dl>
    </div>
  );
}

function SectionHeading({ title, detail }: { readonly title: string; readonly detail: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      <span>{detail}</span>
    </div>
  );
}

function FixtureButton({
  record,
  selected,
  onSelect
}: {
  readonly record: DemoFixtureRecord;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { fixture, scoreline } = record;

  return (
    <button
      type="button"
      className="fixture-button"
      data-selected={selected}
      onClick={onSelect}
    >
      <span className="fixture-teams">
        <strong>{fixture.Participant1}</strong>
        <span>{fixture.Participant2}</span>
      </span>
      <span className="score-pill">
        {scoreline.participant1Goals}-{scoreline.participant2Goals}
      </span>
      <span className="fixture-meta">
        {statusLabel(scoreline.status)} · {formatKickoff(fixture.StartTime)}
      </span>
    </button>
  );
}

function FixtureHeader({ record }: { readonly record: DemoFixtureRecord }) {
  const { fixture, scoreline } = record;

  return (
    <div className="fixture-header">
      <div>
        <p className="eyebrow">Selected fixture</p>
        <h2>
          {fixture.Participant1} vs {fixture.Participant2}
        </h2>
        <p>{record.sourceNote}</p>
      </div>
      <div className="scoreboard" aria-label="Current score">
        <span>{fixture.Participant1}</span>
        <strong>{scoreline.participant1Goals}</strong>
        <span>{fixture.Participant2}</span>
        <strong>{scoreline.participant2Goals}</strong>
      </div>
    </div>
  );
}

function MarketCard({
  market,
  record,
  resolution,
  canPlace,
  onPlace
}: {
  readonly market: PredictionMarket;
  readonly record: DemoFixtureRecord;
  readonly resolution: SoccerResolutionPreview | null;
  readonly canPlace: boolean;
  readonly onPlace: (market: PredictionMarket, side: PositionSide) => void;
}) {
  const label = formatMarketLabel(market.rule.label, record);
  const result = resolution ? resolutionLabel(resolution.side) : "Pending";
  const odds = record.latestOdds[0];

  return (
    <article className="market-card">
      <div className="market-card-top">
        <h3>{label}</h3>
        <span className="result-pill" data-result={resolution?.side ?? "pending"}>
          {result}
        </span>
      </div>
      <p>{resolution?.reason ?? "Waiting for score data."}</p>
      {odds ? (
        <span className="odds-line">
          StablePrice sample: {odds.PriceNames?.join(" / ") ?? odds.SuperOddsType}
        </span>
      ) : (
        <span className="odds-line">No odds snapshot loaded</span>
      )}
      <div className="market-actions">
        <button type="button" disabled={!canPlace} onClick={() => onPlace(market, "yes")}>
          Back Yes
        </button>
        <button type="button" disabled={!canPlace} onClick={() => onPlace(market, "no")}>
          Back No
        </button>
      </div>
    </article>
  );
}

function PositionsPanel({
  positions,
  onSettle
}: {
  readonly positions: readonly Position[];
  readonly onSettle: (position: Position) => void;
}) {
  return (
    <section className="side-section">
      <SectionHeading title="Positions" detail={`${positions.length} on fixture`} />
      {positions.length === 0 ? (
        <div className="soft-empty">
          <strong>No positions yet</strong>
          <span>Back a market to create a mock receipt.</span>
        </div>
      ) : (
        <div className="position-list">
          {positions.map((position) => (
            <div className="position-row" key={position.id}>
              <div>
                <strong>{position.marketLabel}</strong>
                <span>
                  {position.side.toUpperCase()} · {position.stake} pts
                </span>
              </div>
              <button
                type="button"
                disabled={position.status === "settled"}
                onClick={() => onSettle(position)}
              >
                {position.status === "settled" ? "Settled" : "Settle"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReceiptPanel({ receipt }: { readonly receipt: Receipt | null }) {
  if (!receipt) {
    return (
      <section className="receipt-panel">
        <SectionHeading title="Receipt" detail="No receipt selected" />
        <div className="soft-empty">
          <strong>Settlement trail appears here</strong>
          <span>Settle an open position to see source, rule, outcome, and ledger movement.</span>
        </div>
      </section>
    );
  }

  const { fixtureRecord, resolution, market, position } = receipt;
  const plan = buildSoccerValidationPlan(market.rule);
  const won = resolution.side === position.side;

  return (
    <section className="receipt-panel" data-status={receipt.status}>
      <SectionHeading title="Receipt" detail={receipt.status} />
      <div className="receipt-stack">
        <ReceiptItem
          label="Fixture"
          value={`${fixtureRecord.fixture.Participant1} ${fixtureRecord.scoreline.participant1Goals}-${fixtureRecord.scoreline.participant2Goals} ${fixtureRecord.fixture.Participant2}`}
        />
        <ReceiptItem label="Market rule" value={formatMarketLabel(market.rule.label, fixtureRecord)} />
        <ReceiptItem label="Score source" value={resolution.statSource ?? "No score source"} />
        <ReceiptItem label="Outcome" value={resolutionLabel(resolution.side)} />
        <ReceiptItem
          label="Position"
          value={`${position.side.toUpperCase()} · ${won ? "winning side" : receipt.status === "pending" ? "waiting" : "losing side"}`}
        />
        <ReceiptItem
          label="Ledger movement"
          value={
            receipt.status === "pending"
              ? "No movement yet"
              : `${receipt.payout} pts payout (${formatSigned(receipt.ledgerDelta)} pts net)`
          }
        />
      </div>

      <details className="proof-details">
        <summary>Advanced proof placeholder</summary>
        <dl>
          <div>
            <dt>Endpoint</dt>
            <dd>
              /api/scores/stat-validation?fixtureId={market.rule.fixtureId}
              {resolution.sourceSeq ? `&seq=${resolution.sourceSeq}` : "&seq=<score-seq>"}
              &statKey={plan.statKey}
              {plan.statKey2 ? `&statKey2=${plan.statKey2}` : ""}
            </dd>
          </div>
          <div>
            <dt>Predicate</dt>
            <dd>
              {plan.predicate.comparison} {plan.predicate.threshold}
              {plan.op ? ` using ${plan.op}` : ""}
            </dd>
          </div>
          <div>
            <dt>Receipt note</dt>
            <dd>{plan.explanation}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

function ReceiptItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="receipt-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-grid" aria-busy="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="skeleton-card" key={index} />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { readonly message: string; readonly onRetry: () => void }) {
  return (
    <div className="state-panel" role="alert">
      <h2>Could not load fixtures</h2>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function EmptyState({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="state-panel">
      <h2>No fixtures available</h2>
      <p>Try refreshing, or check the TxLINE token settings.</p>
      <button type="button" onClick={onRetry}>
        Refresh
      </button>
    </div>
  );
}

function formatMarketLabel(label: string, record: DemoFixtureRecord): string {
  return label
    .replace("Participant 1", record.fixture.Participant1)
    .replace("Participant 2", record.fixture.Participant2);
}

function resolutionLabel(side: ResolutionSide): string {
  if (side === "yes") {
    return "Would resolve YES";
  }

  if (side === "no") {
    return "Would resolve NO";
  }

  if (side === "void") {
    return "Void";
  }

  return "Pending";
}

function statusLabel(status: string): string {
  if (status === "final") {
    return "Final";
  }

  if (status === "live") {
    return "Live";
  }

  if (status === "void") {
    return "Void";
  }

  return "Upcoming";
}

function formatKickoff(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(timestamp);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
