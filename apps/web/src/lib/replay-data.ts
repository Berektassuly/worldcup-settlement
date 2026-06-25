import type { Fixture, Odds } from "@worldcup-settlement/shared";
import type { DemoFixtureRecord, DemoFixturesResponse } from "./demo-types";

const competitionId = 500001;
const fixtureGroupId = 9001;
const worldCupStartTs = Date.UTC(2026, 5, 11, 19, 0, 0);

export function replayFixturesResponse(reason = "Replay data is active."): DemoFixturesResponse {
  return {
    mode: "replay",
    reason,
    fixtures: replayFixtureRecords
  };
}

export const replayFixtureRecords: readonly DemoFixtureRecord[] = [
  {
    fixture: fixture({
      fixtureId: 17588227,
      startTime: worldCupStartTs,
      participant1: "Mexico",
      participant2: "South Africa",
      participant1Id: 101,
      participant2Id: 102
    }),
    scoreline: {
      participant1Goals: 2,
      participant2Goals: 1,
      status: "final",
      sourceSeq: 118,
      sourceTs: Date.UTC(2026, 5, 11, 21, 1, 0),
      sourceLabel: "Replay score seq 118"
    },
    latestOdds: odds(17588227, ["Mexico", "Draw", "South Africa"], [1900, 3100, 4200]),
    sourceNote: "Finished replay fixture with a proof-ready score event."
  },
  {
    fixture: fixture({
      fixtureId: 17588388,
      startTime: Date.UTC(2026, 5, 19, 19, 0, 0),
      participant1: "USA",
      participant2: "Australia",
      participant1Id: 201,
      participant2Id: 202
    }),
    scoreline: {
      participant1Goals: 1,
      participant2Goals: 1,
      status: "live",
      sourceSeq: 64,
      sourceTs: Date.UTC(2026, 5, 19, 20, 12, 0),
      sourceLabel: "Replay score seq 64"
    },
    latestOdds: odds(17588388, ["USA", "Draw", "Australia"], [2400, 2600, 3300]),
    sourceNote: "Live replay state for would-resolve-now behavior."
  },
  {
    fixture: fixture({
      fixtureId: 17588228,
      startTime: Date.UTC(2026, 5, 17, 20, 0, 0),
      participant1: "England",
      participant2: "Croatia",
      participant1Id: 301,
      participant2Id: 302
    }),
    scoreline: {
      participant1Goals: 0,
      participant2Goals: 0,
      status: "not_started",
      sourceLabel: "Fixture snapshot"
    },
    latestOdds: odds(17588228, ["England", "Draw", "Croatia"], [2100, 3000, 3600]),
    sourceNote: "Upcoming replay fixture showing pending settlement state."
  }
] as const;

function fixture(input: {
  fixtureId: number;
  startTime: number;
  participant1: string;
  participant2: string;
  participant1Id: number;
  participant2Id: number;
}): Fixture {
  return {
    Ts: input.startTime - 86_400_000,
    StartTime: input.startTime,
    Competition: "World Cup > Group Stage",
    CompetitionId: competitionId,
    FixtureGroupId: fixtureGroupId,
    Participant1Id: input.participant1Id,
    Participant1: input.participant1,
    Participant2Id: input.participant2Id,
    Participant2: input.participant2,
    FixtureId: input.fixtureId,
    Participant1IsHome: true
  };
}

function odds(fixtureId: number, names: readonly string[], prices: readonly number[]): Odds[] {
  return [
    {
      FixtureId: fixtureId,
      MessageId: `replay-${fixtureId}-match-winner`,
      Ts: Date.UTC(2026, 5, 11, 18, 30, 0),
      Bookmaker: "TxLINE Replay",
      BookmakerId: 0,
      SuperOddsType: "Match Winner",
      GameState: "Replay",
      InRunning: false,
      PriceNames: [...names],
      Prices: [...prices]
    }
  ];
}
