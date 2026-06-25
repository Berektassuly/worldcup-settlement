import { describe, expect, it } from "vitest";
import type { Fixture, Score } from "@worldcup-settlement/shared";
import {
  buildSoccerValidationPlan,
  createSoccerMarketTemplates,
  resolveSoccerMarket,
  scorelineFromScoreUpdates,
  soccerStatusFromScore
} from "./soccer";
import type { MarketKind, PredictionMarket } from "./markets";

const fixture: Fixture = {
  Ts: 1,
  StartTime: 1,
  Competition: "World Cup",
  CompetitionId: 101,
  FixtureGroupId: 202,
  Participant1Id: 1,
  Participant1: "Mexico",
  Participant2Id: 2,
  Participant2: "South Africa",
  FixtureId: 17588227,
  Participant1IsHome: true
};

describe("soccer market templates", () => {
  it("creates the complete soccer-only market set for a fixture", () => {
    const markets = createSoccerMarketTemplates(fixture);

    expect(markets).toHaveLength(13);
    expect(markets.map((market) => market.rule.label)).toEqual([
      "Participant 1 wins",
      "Participant 2 wins",
      "Draw",
      "Total goals over 2.5",
      "Total goals under 2.5",
      "Participant 1 goals over 0.5",
      "Participant 1 goals under 0.5",
      "Participant 1 goals over 1.5",
      "Participant 1 goals under 1.5",
      "Participant 2 goals over 0.5",
      "Participant 2 goals under 0.5",
      "Participant 2 goals over 1.5",
      "Participant 2 goals under 1.5"
    ]);
  });
});

describe("resolveSoccerMarket", () => {
  it("resolves participant 1, participant 2, and draw outcomes", () => {
    expect(resolve(market("participant_1_win"), 2, 1)).toBe("yes");
    expect(resolve(market("participant_1_win"), 1, 1)).toBe("no");
    expect(resolve(market("participant_2_win"), 1, 2)).toBe("yes");
    expect(resolve(market("participant_2_win"), 2, 1)).toBe("no");
    expect(resolve(market("draw"), 2, 2)).toBe("yes");
    expect(resolve(market("draw"), 3, 2)).toBe("no");
  });

  it("resolves total goals over and under 2.5 with integer-safe comparisons", () => {
    expect(resolve(market("total_goals_over", 2.5), 2, 1)).toBe("yes");
    expect(resolve(market("total_goals_over", 2.5), 1, 1)).toBe("no");
    expect(resolve(market("total_goals_under", 2.5), 1, 1)).toBe("yes");
    expect(resolve(market("total_goals_under", 2.5), 2, 1)).toBe("no");
  });

  it("resolves participant 1 team total lines at 0.5 and 1.5", () => {
    expect(resolve(market("participant_1_goals_over", 0.5), 1, 0)).toBe("yes");
    expect(resolve(market("participant_1_goals_over", 0.5), 0, 0)).toBe("no");
    expect(resolve(market("participant_1_goals_under", 0.5), 0, 0)).toBe("yes");
    expect(resolve(market("participant_1_goals_under", 0.5), 1, 0)).toBe("no");
    expect(resolve(market("participant_1_goals_over", 1.5), 2, 0)).toBe("yes");
    expect(resolve(market("participant_1_goals_over", 1.5), 1, 0)).toBe("no");
    expect(resolve(market("participant_1_goals_under", 1.5), 1, 0)).toBe("yes");
    expect(resolve(market("participant_1_goals_under", 1.5), 2, 0)).toBe("no");
  });

  it("resolves participant 2 team total lines at 0.5 and 1.5", () => {
    expect(resolve(market("participant_2_goals_over", 0.5), 0, 1)).toBe("yes");
    expect(resolve(market("participant_2_goals_over", 0.5), 0, 0)).toBe("no");
    expect(resolve(market("participant_2_goals_under", 0.5), 0, 0)).toBe("yes");
    expect(resolve(market("participant_2_goals_under", 0.5), 0, 1)).toBe("no");
    expect(resolve(market("participant_2_goals_over", 1.5), 0, 2)).toBe("yes");
    expect(resolve(market("participant_2_goals_over", 1.5), 0, 1)).toBe("no");
    expect(resolve(market("participant_2_goals_under", 1.5), 0, 1)).toBe("yes");
    expect(resolve(market("participant_2_goals_under", 1.5), 0, 2)).toBe("no");
  });

  it("returns pending before kickoff and void for non-settleable fixture status", () => {
    expect(
      resolveSoccerMarket(market("draw"), {
        participant1Goals: 0,
        participant2Goals: 0,
        status: "not_started",
        sourceLabel: "Replay"
      }).side
    ).toBe("pending");

    expect(
      resolveSoccerMarket(market("draw"), {
        participant1Goals: 0,
        participant2Goals: 0,
        status: "void",
        sourceLabel: "Replay"
      }).side
    ).toBe("void");
  });

  it("rejects invalid scorelines", () => {
    expect(() =>
      resolveSoccerMarket(market("draw"), {
        participant1Goals: -1,
        participant2Goals: 0,
        status: "live",
        sourceLabel: "Replay"
      })
    ).toThrow("non-negative integers");
  });
});

describe("buildSoccerValidationPlan", () => {
  it("maps winner and draw markets to stat 1/2 expressions", () => {
    expect(buildSoccerValidationPlan(market("participant_1_win").rule)).toMatchObject({
      statKey: 1,
      statKey2: 2,
      op: "subtract",
      predicate: { comparison: "greaterThan", threshold: 0 }
    });

    expect(buildSoccerValidationPlan(market("participant_2_win").rule)).toMatchObject({
      statKey: 2,
      statKey2: 1,
      op: "subtract",
      predicate: { comparison: "greaterThan", threshold: 0 }
    });

    expect(buildSoccerValidationPlan(market("draw").rule)).toMatchObject({
      statKey: 1,
      statKey2: 2,
      op: "subtract",
      predicate: { comparison: "equalTo", threshold: 0 }
    });
  });

  it("maps half-goal lines to integer predicate thresholds", () => {
    expect(buildSoccerValidationPlan(market("total_goals_over", 2.5).rule)).toMatchObject({
      statKey: 1,
      statKey2: 2,
      op: "add",
      predicate: { comparison: "greaterThan", threshold: 2 }
    });

    expect(buildSoccerValidationPlan(market("total_goals_under", 2.5).rule)).toMatchObject({
      statKey: 1,
      statKey2: 2,
      op: "add",
      predicate: { comparison: "lessThan", threshold: 3 }
    });

    expect(buildSoccerValidationPlan(market("participant_1_goals_under", 1.5).rule)).toMatchObject({
      statKey: 1,
      predicate: { comparison: "lessThan", threshold: 2 }
    });
  });
});

describe("scoreline extraction", () => {
  it("extracts latest participant goals from TxLINE-shaped score updates", () => {
    const scores = [
      score(1, 100, 0, 0),
      score(2, 200, 2, 1)
    ];

    expect(scorelineFromScoreUpdates(scores)).toMatchObject({
      participant1Goals: 2,
      participant2Goals: 1,
      sourceSeq: 2,
      sourceTs: 200
    });
  });

  it("maps soccer status ids and game states", () => {
    expect(soccerStatusFromScore({ gameState: "NS", statusSoccerId: 1 })).toBe("not_started");
    expect(soccerStatusFromScore({ gameState: "F", statusSoccerId: 5 })).toBe("final");
    expect(soccerStatusFromScore({ gameState: "C", statusSoccerId: 16 })).toBe("void");
    expect(soccerStatusFromScore({ gameState: "H2", statusSoccerId: 4 })).toBe("live");
  });
});

function market(kind: MarketKind, threshold?: number): PredictionMarket {
  return {
    id: `fixture:${kind}:${threshold ?? "none"}`,
    rule: {
      kind,
      fixtureId: fixture.FixtureId,
      threshold,
      label: `${kind}${threshold ? ` ${threshold}` : ""}`
    },
    status: "open",
    createdAt: 0
  };
}

function resolve(marketToResolve: PredictionMarket, participant1Goals: number, participant2Goals: number) {
  return resolveSoccerMarket(marketToResolve, {
    participant1Goals,
    participant2Goals,
    status: "live",
    sourceSeq: 10,
    sourceTs: 1000,
    sourceLabel: "Replay"
  }).side;
}

function score(seq: number, ts: number, participant1Goals: number, participant2Goals: number): Score {
  return {
    fixtureId: fixture.FixtureId,
    gameState: "H2",
    startTime: fixture.StartTime,
    isTeam: true,
    fixtureGroupId: fixture.FixtureGroupId,
    competitionId: fixture.CompetitionId,
    countryId: 1,
    sportId: 1,
    participant1IsHome: true,
    participant2Id: fixture.Participant2Id,
    participant1Id: fixture.Participant1Id,
    action: "score",
    id: seq,
    ts,
    connectionId: 1,
    seq,
    statusSoccerId: 4,
    data: {
      Score: {
        Participant1: participant1Goals,
        Participant2: participant2Goals
      }
    }
  };
}
