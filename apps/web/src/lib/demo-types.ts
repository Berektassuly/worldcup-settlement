import type { SoccerScoreline } from "@worldcup-settlement/domain";
import type { ProofEvaluation } from "@worldcup-settlement/settlement";
import type { AnchorValidateStatInput } from "@worldcup-settlement/solana-adapter";
import type { Fixture, Odds } from "@worldcup-settlement/shared";

export type DemoDataMode = "txline" | "replay";

export type DemoFixtureRecord = {
  readonly fixture: Fixture;
  readonly scoreline: SoccerScoreline;
  readonly latestOdds: readonly Odds[];
  readonly sourceNote: string;
};

export type DemoFixturesResponse = {
  readonly mode: DemoDataMode;
  readonly reason: string;
  readonly fixtures: readonly DemoFixtureRecord[];
};

export type DemoProofStatus = "available" | "predicate_failed" | "unavailable";

export type DemoProofResponse = {
  readonly mode: DemoDataMode;
  readonly status: DemoProofStatus;
  readonly reason: string;
  readonly sourceSeq: number;
  readonly request: {
    readonly fixtureId: number;
    readonly seq: number;
    readonly statKey: number;
    readonly statKey2?: number;
    readonly comparison: ProofEvaluation["predicate"]["comparison"];
    readonly threshold: number;
    readonly op?: ProofEvaluation["operation"];
  };
  readonly validation?: {
    readonly payloadTs: number;
    readonly targetTs: number;
    readonly fixtureId: number;
    readonly statA: {
      readonly key: number;
      readonly value: number;
      readonly period: number;
    };
    readonly statB?: {
      readonly key: number;
      readonly value: number;
      readonly period: number;
    };
    readonly proofNodeCounts: {
      readonly statA: number;
      readonly statB?: number;
      readonly fixture: number;
      readonly main: number;
    };
  };
  readonly evaluation?: ProofEvaluation;
  readonly anchorInput?: AnchorValidateStatInput;
  readonly raw?: unknown;
};
