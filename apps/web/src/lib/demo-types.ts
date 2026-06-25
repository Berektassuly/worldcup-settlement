import type { SoccerScoreline } from "@worldcup-settlement/domain";
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
