import { SOCCER_GAME_PHASE_IDS, SOCCER_STAT_KEYS, type Fixture, type Score } from "@worldcup-settlement/shared";
import type { MarketKind, MarketRule, PredictionMarket, ResolutionPreview } from "./markets";

export type HalfGoalLine = 0.5 | 1.5 | 2.5;

export type SoccerScoreStatus = "not_started" | "live" | "final" | "void";

export type SoccerScoreline = {
  readonly participant1Goals: number;
  readonly participant2Goals: number;
  readonly status: SoccerScoreStatus;
  readonly sourceSeq?: number;
  readonly sourceTs?: number;
  readonly sourceLabel: string;
};

export type SoccerMarketTemplate = {
  readonly kind: MarketKind;
  readonly line?: HalfGoalLine;
  readonly label: string;
  readonly shortLabel: string;
};

export type StatComparison = "greaterThan" | "lessThan" | "equalTo";
export type BinaryOperation = "add" | "subtract";

export type SoccerValidationPlan = {
  readonly statKey: number;
  readonly statKey2?: number;
  readonly op?: BinaryOperation;
  readonly predicate: {
    readonly comparison: StatComparison;
    readonly threshold: number;
  };
  readonly explanation: string;
};

export type SoccerResolutionPreview = ResolutionPreview & {
  readonly validationPlan?: SoccerValidationPlan;
  readonly scoreStatus: SoccerScoreStatus;
};

export const SOCCER_MARKET_TEMPLATES: readonly SoccerMarketTemplate[] = [
  {
    kind: "participant_1_win",
    label: "Participant 1 wins",
    shortLabel: "P1 win"
  },
  {
    kind: "participant_2_win",
    label: "Participant 2 wins",
    shortLabel: "P2 win"
  },
  {
    kind: "draw",
    label: "Draw",
    shortLabel: "Draw"
  },
  {
    kind: "total_goals_over",
    line: 2.5,
    label: "Total goals over 2.5",
    shortLabel: "Over 2.5"
  },
  {
    kind: "total_goals_under",
    line: 2.5,
    label: "Total goals under 2.5",
    shortLabel: "Under 2.5"
  },
  {
    kind: "participant_1_goals_over",
    line: 0.5,
    label: "Participant 1 goals over 0.5",
    shortLabel: "P1 over 0.5"
  },
  {
    kind: "participant_1_goals_under",
    line: 0.5,
    label: "Participant 1 goals under 0.5",
    shortLabel: "P1 under 0.5"
  },
  {
    kind: "participant_1_goals_over",
    line: 1.5,
    label: "Participant 1 goals over 1.5",
    shortLabel: "P1 over 1.5"
  },
  {
    kind: "participant_1_goals_under",
    line: 1.5,
    label: "Participant 1 goals under 1.5",
    shortLabel: "P1 under 1.5"
  },
  {
    kind: "participant_2_goals_over",
    line: 0.5,
    label: "Participant 2 goals over 0.5",
    shortLabel: "P2 over 0.5"
  },
  {
    kind: "participant_2_goals_under",
    line: 0.5,
    label: "Participant 2 goals under 0.5",
    shortLabel: "P2 under 0.5"
  },
  {
    kind: "participant_2_goals_over",
    line: 1.5,
    label: "Participant 2 goals over 1.5",
    shortLabel: "P2 over 1.5"
  },
  {
    kind: "participant_2_goals_under",
    line: 1.5,
    label: "Participant 2 goals under 1.5",
    shortLabel: "P2 under 1.5"
  }
] as const;

export function createSoccerMarketTemplates(fixture: Pick<Fixture, "FixtureId">): PredictionMarket[] {
  return SOCCER_MARKET_TEMPLATES.map((template) => ({
    id: soccerMarketId(fixture.FixtureId, template),
    rule: {
      kind: template.kind,
      fixtureId: fixture.FixtureId,
      threshold: template.line,
      label: template.label
    },
    status: "open",
    createdAt: 0
  }));
}

export function resolveSoccerMarket(
  market: PredictionMarket,
  scoreline: SoccerScoreline | null
): SoccerResolutionPreview {
  if (!scoreline) {
    return {
      marketId: market.id,
      side: "pending",
      reason: "No score source is available yet.",
      scoreStatus: "not_started"
    };
  }

  validateScoreline(scoreline);

  if (scoreline.status === "void") {
    return {
      marketId: market.id,
      side: "void",
      reason: "Fixture is void because coverage or match status is not settleable.",
      sourceSeq: scoreline.sourceSeq,
      sourceTs: scoreline.sourceTs,
      score: toPreviewScore(scoreline),
      statSource: scoreline.sourceLabel,
      validationPlan: buildSoccerValidationPlan(market.rule),
      scoreStatus: scoreline.status
    };
  }

  if (scoreline.status === "not_started") {
    return {
      marketId: market.id,
      side: "pending",
      reason: "Fixture has not started.",
      sourceSeq: scoreline.sourceSeq,
      sourceTs: scoreline.sourceTs,
      score: toPreviewScore(scoreline),
      statSource: scoreline.sourceLabel,
      validationPlan: buildSoccerValidationPlan(market.rule),
      scoreStatus: scoreline.status
    };
  }

  const isYes = evaluateRule(market.rule, scoreline);

  return {
    marketId: market.id,
    side: isYes ? "yes" : "no",
    reason: `${market.rule.label} is ${isYes ? "true" : "false"} at ${scoreline.participant1Goals}-${scoreline.participant2Goals}.`,
    sourceSeq: scoreline.sourceSeq,
    sourceTs: scoreline.sourceTs,
    score: toPreviewScore(scoreline),
    statSource: scoreline.sourceLabel,
    validationPlan: buildSoccerValidationPlan(market.rule),
    scoreStatus: scoreline.status
  };
}

export function buildSoccerValidationPlan(rule: MarketRule): SoccerValidationPlan {
  const line = requireLineForRule(rule);

  switch (rule.kind) {
    case "participant_1_win":
      return {
        statKey: SOCCER_STAT_KEYS.participant1Goals,
        statKey2: SOCCER_STAT_KEYS.participant2Goals,
        op: "subtract",
        predicate: { comparison: "greaterThan", threshold: 0 },
        explanation: "Prove participant 1 goals minus participant 2 goals is greater than 0."
      };
    case "participant_2_win":
      return {
        statKey: SOCCER_STAT_KEYS.participant2Goals,
        statKey2: SOCCER_STAT_KEYS.participant1Goals,
        op: "subtract",
        predicate: { comparison: "greaterThan", threshold: 0 },
        explanation: "Prove participant 2 goals minus participant 1 goals is greater than 0."
      };
    case "draw":
      return {
        statKey: SOCCER_STAT_KEYS.participant1Goals,
        statKey2: SOCCER_STAT_KEYS.participant2Goals,
        op: "subtract",
        predicate: { comparison: "equalTo", threshold: 0 },
        explanation: "Prove participant 1 goals minus participant 2 goals equals 0."
      };
    case "total_goals_over":
      return {
        statKey: SOCCER_STAT_KEYS.participant1Goals,
        statKey2: SOCCER_STAT_KEYS.participant2Goals,
        op: "add",
        predicate: { comparison: "greaterThan", threshold: Math.floor(line) },
        explanation: `Prove total goals is greater than ${Math.floor(line)}.`
      };
    case "total_goals_under":
      return {
        statKey: SOCCER_STAT_KEYS.participant1Goals,
        statKey2: SOCCER_STAT_KEYS.participant2Goals,
        op: "add",
        predicate: { comparison: "lessThan", threshold: Math.ceil(line) },
        explanation: `Prove total goals is less than ${Math.ceil(line)}.`
      };
    case "participant_1_goals_over":
      return teamGoalsPlan(SOCCER_STAT_KEYS.participant1Goals, "greaterThan", Math.floor(line));
    case "participant_1_goals_under":
      return teamGoalsPlan(SOCCER_STAT_KEYS.participant1Goals, "lessThan", Math.ceil(line));
    case "participant_2_goals_over":
      return teamGoalsPlan(SOCCER_STAT_KEYS.participant2Goals, "greaterThan", Math.floor(line));
    case "participant_2_goals_under":
      return teamGoalsPlan(SOCCER_STAT_KEYS.participant2Goals, "lessThan", Math.ceil(line));
    default:
      return assertNever(rule.kind);
  }
}

export function scorelineFromScoreUpdates(scores: readonly Score[]): SoccerScoreline | null {
  const sorted = [...scores].sort((a, b) => a.ts - b.ts || a.seq - b.seq);

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const score = sorted[index];
    const participant1Goals = readFirstNumber(score, PARTICIPANT_1_GOAL_PATHS);
    const participant2Goals = readFirstNumber(score, PARTICIPANT_2_GOAL_PATHS);

    if (participant1Goals !== null && participant2Goals !== null) {
      return {
        participant1Goals,
        participant2Goals,
        status: soccerStatusFromScore(score),
        sourceSeq: score.seq,
        sourceTs: score.ts,
        sourceLabel: `TxLINE score seq ${score.seq}`
      };
    }
  }

  return null;
}

export function soccerStatusFromScore(score: Pick<Score, "gameState" | "statusSoccerId">): SoccerScoreStatus {
  const gameState = score.gameState.toUpperCase();

  if (score.statusSoccerId === SOCCER_GAME_PHASE_IDS.notStarted || gameState === "NS") {
    return "not_started";
  }

  if (
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.finished ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.finishedAfterExtraTime ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.finishedAfterPenalties ||
    gameState === "F" ||
    gameState === "FET" ||
    gameState === "FPE"
  ) {
    return "final";
  }

  if (
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.interrupted ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.abandoned ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.cancelled ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.coverageCancelled ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.coverageSuspended ||
    score.statusSoccerId === SOCCER_GAME_PHASE_IDS.postponed ||
    ["I", "A", "C", "TXCC", "TXCS", "P"].includes(gameState)
  ) {
    return "void";
  }

  return "live";
}

function evaluateRule(rule: MarketRule, scoreline: SoccerScoreline): boolean {
  switch (rule.kind) {
    case "participant_1_win":
      return scoreline.participant1Goals > scoreline.participant2Goals;
    case "participant_2_win":
      return scoreline.participant2Goals > scoreline.participant1Goals;
    case "draw":
      return scoreline.participant1Goals === scoreline.participant2Goals;
    case "total_goals_over":
      return overHalfGoalLine(scoreline.participant1Goals + scoreline.participant2Goals, requireLineForRule(rule));
    case "total_goals_under":
      return underHalfGoalLine(scoreline.participant1Goals + scoreline.participant2Goals, requireLineForRule(rule));
    case "participant_1_goals_over":
      return overHalfGoalLine(scoreline.participant1Goals, requireLineForRule(rule));
    case "participant_1_goals_under":
      return underHalfGoalLine(scoreline.participant1Goals, requireLineForRule(rule));
    case "participant_2_goals_over":
      return overHalfGoalLine(scoreline.participant2Goals, requireLineForRule(rule));
    case "participant_2_goals_under":
      return underHalfGoalLine(scoreline.participant2Goals, requireLineForRule(rule));
    default:
      return assertNever(rule.kind);
  }
}

function overHalfGoalLine(goals: number, line: HalfGoalLine): boolean {
  return goals * 2 > lineToTwiceGoals(line);
}

function underHalfGoalLine(goals: number, line: HalfGoalLine): boolean {
  return goals * 2 < lineToTwiceGoals(line);
}

function lineToTwiceGoals(line: HalfGoalLine): number {
  return Math.round(line * 2);
}

function requireLineForRule(rule: MarketRule): HalfGoalLine {
  if (rule.kind === "participant_1_win" || rule.kind === "participant_2_win" || rule.kind === "draw") {
    return 0.5;
  }

  if (rule.threshold === 0.5 || rule.threshold === 1.5 || rule.threshold === 2.5) {
    return rule.threshold;
  }

  throw new Error(`Market ${rule.kind} requires a supported half-goal line`);
}

function teamGoalsPlan(
  statKey: number,
  comparison: StatComparison,
  threshold: number
): SoccerValidationPlan {
  return {
    statKey,
    predicate: { comparison, threshold },
    explanation: `Prove stat key ${statKey} is ${comparison} ${threshold}.`
  };
}

function soccerMarketId(fixtureId: number, template: SoccerMarketTemplate): string {
  return `${fixtureId}:${template.kind}${template.line ? `:${template.line}` : ""}`;
}

function validateScoreline(scoreline: SoccerScoreline): void {
  if (
    !Number.isInteger(scoreline.participant1Goals) ||
    !Number.isInteger(scoreline.participant2Goals) ||
    scoreline.participant1Goals < 0 ||
    scoreline.participant2Goals < 0
  ) {
    throw new Error("Soccer goals must be non-negative integers");
  }
}

function toPreviewScore(scoreline: SoccerScoreline) {
  return {
    participant1Goals: scoreline.participant1Goals,
    participant2Goals: scoreline.participant2Goals
  };
}

function readFirstNumber(source: unknown, paths: readonly (readonly string[])[]): number | null {
  for (const path of paths) {
    const value = readPath(source, path);
    if (typeof value === "number" && Number.isInteger(value)) {
      return value;
    }
  }

  return null;
}

function readPath(source: unknown, path: readonly string[]): unknown {
  let current = source;

  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported market kind: ${value}`);
}

const PARTICIPANT_1_GOAL_PATHS = [
  ["type", "Participant1", "Goals"],
  ["type", "Participant1", "Score"],
  ["type", "Participant1", "TotalGoals"],
  ["data", "Participant1", "Goals"],
  ["data", "Participant1", "Score"],
  ["data", "Score", "Participant1"],
  ["data", "Score", "Participant1Goals"],
  ["data", "New", "Score", "Participant1"],
  ["data", "New", "Participant1", "Goals"],
  ["score", "Participant1", "Goals"],
  ["score", "Participant1", "Score"]
] as const;

const PARTICIPANT_2_GOAL_PATHS = [
  ["type", "Participant2", "Goals"],
  ["type", "Participant2", "Score"],
  ["type", "Participant2", "TotalGoals"],
  ["data", "Participant2", "Goals"],
  ["data", "Participant2", "Score"],
  ["data", "Score", "Participant2"],
  ["data", "Score", "Participant2Goals"],
  ["data", "New", "Score", "Participant2"],
  ["data", "New", "Participant2", "Goals"],
  ["score", "Participant2", "Goals"],
  ["score", "Participant2", "Score"]
] as const;
