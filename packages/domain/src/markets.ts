import type { Fixture, Odds, Score, ScoresStatValidation } from "@worldcup-settlement/shared";

export const SUPPORTED_MARKET_KINDS = [
  "participant_1_win",
  "participant_2_win",
  "draw",
  "total_goals_over",
  "total_goals_under",
  "participant_1_goals_over",
  "participant_1_goals_under",
  "participant_2_goals_over",
  "participant_2_goals_under"
] as const;

export type MarketKind = (typeof SUPPORTED_MARKET_KINDS)[number];

export type MarketStatus = "draft" | "open" | "locked" | "resolved" | "void";

export type MarketRule = {
  readonly kind: MarketKind;
  readonly fixtureId: number;
  readonly threshold?: number;
  readonly label: string;
};

export type PredictionMarket = {
  readonly id: string;
  readonly rule: MarketRule;
  readonly status: MarketStatus;
  readonly createdAt: number;
};

export type MarketDataSnapshot = {
  readonly fixture: Fixture;
  readonly latestScores: readonly Score[];
  readonly latestOdds: readonly Odds[];
};

export type ResolutionSide = "yes" | "no" | "void" | "pending";

export type ResolutionPreview = {
  readonly marketId: string;
  readonly side: ResolutionSide;
  readonly reason: string;
  readonly sourceSeq?: number;
  readonly sourceTs?: number;
  readonly score?: {
    readonly participant1Goals: number;
    readonly participant2Goals: number;
  };
  readonly statSource?: string;
};

export type ProofProvider = {
  getScoreStatValidation(input: {
    fixtureId: number;
    seq: number;
    statKey: number;
    statKey2?: number;
  }): Promise<ScoresStatValidation>;
};
