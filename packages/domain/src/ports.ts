import type { Fixture, Odds, Score } from "@worldcup-settlement/shared";
import type { MarketDataSnapshot, PredictionMarket, ResolutionPreview } from "./markets";

export type FixtureRepository = {
  listFixtures(input?: { competitionId?: number; startEpochDay?: number }): Promise<readonly Fixture[]>;
};

export type ScoreRepository = {
  getScoresForFixture(fixtureId: number): Promise<readonly Score[]>;
  getHistoricalScoresForFixture(fixtureId: number): Promise<readonly Score[]>;
};

export type OddsRepository = {
  getOddsForFixture(fixtureId: number): Promise<readonly Odds[]>;
};

export type MarketRepository = {
  listMarketsForFixture(fixtureId: number): Promise<readonly PredictionMarket[]>;
  saveMarket(market: PredictionMarket): Promise<void>;
};

export type ResolutionEngine = {
  preview(market: PredictionMarket, snapshot: MarketDataSnapshot): ResolutionPreview;
};
