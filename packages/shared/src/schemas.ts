import { z } from "zod";

const integer = z.number().int();
const timestampMs = integer;
const hashValueSchema = z.union([z.string(), z.array(integer), z.instanceof(Uint8Array)]);

export const fixtureSchema = z.object({
  Ts: timestampMs,
  StartTime: timestampMs,
  Competition: z.string(),
  CompetitionId: integer,
  FixtureGroupId: integer,
  Participant1Id: integer,
  Participant1: z.string(),
  Participant2Id: integer,
  Participant2: z.string(),
  FixtureId: integer,
  Participant1IsHome: z.boolean()
});

export const oddsSchema = z.object({
  FixtureId: integer,
  MessageId: z.string(),
  Ts: timestampMs,
  Bookmaker: z.string(),
  BookmakerId: integer,
  SuperOddsType: z.string(),
  GameState: z.string().optional(),
  InRunning: z.boolean(),
  MarketParameters: z.string().optional(),
  MarketPeriod: z.string().optional(),
  PriceNames: z.array(z.string()).optional(),
  Prices: z.array(integer).optional()
});

export const scoreSchema = z
  .object({
    fixtureId: integer,
    gameState: z.string(),
    startTime: timestampMs,
    isTeam: z.boolean(),
    fixtureGroupId: integer,
    competitionId: integer,
    countryId: integer,
    sportId: integer,
    participant1IsHome: z.boolean(),
    participant2Id: integer,
    participant1Id: integer,
    coverageSecondaryData: z.boolean().optional(),
    coverageType: z.string().optional(),
    action: z.string(),
    id: integer,
    ts: timestampMs,
    connectionId: integer,
    seq: integer,
    statusSoccerId: integer.optional(),
    confirmed: z.boolean().optional(),
    type: z.unknown().optional(),
    data: z.unknown().optional()
  })
  .passthrough();

export const proofNodeSchema = z.object({
  hash: hashValueSchema,
  isRightSibling: z.boolean()
});

export const scoreStatSchema = z.object({
  key: integer,
  value: integer,
  period: integer
});

const rawScoresBatchSummarySchema = z.object({
  fixtureId: integer,
  updateStats: z.object({
    updateCount: integer,
    minTimestamp: timestampMs,
    maxTimestamp: timestampMs
  }),
  eventsSubTreeRoot: hashValueSchema.optional(),
  eventStatsSubTreeRoot: hashValueSchema.optional()
});

export const scoresBatchSummarySchema = rawScoresBatchSummarySchema.transform(
  (summary, context) => {
    const eventsSubTreeRoot = summary.eventsSubTreeRoot ?? summary.eventStatsSubTreeRoot;

    if (!eventsSubTreeRoot) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Scores batch summary did not include an events sub-tree root"
      });
      return z.NEVER;
    }

    return {
      fixtureId: summary.fixtureId,
      updateStats: summary.updateStats,
      eventsSubTreeRoot
    };
  }
);

export const scoresStatValidationSchema = z.object({
  ts: timestampMs,
  statToProve: scoreStatSchema,
  eventStatRoot: hashValueSchema,
  summary: scoresBatchSummarySchema,
  statProof: z.array(proofNodeSchema),
  subTreeProof: z.array(proofNodeSchema),
  mainTreeProof: z.array(proofNodeSchema),
  statToProve2: scoreStatSchema.optional(),
  statProof2: z.array(proofNodeSchema).optional()
});

export const fixtureArraySchema = z.array(fixtureSchema);
export const oddsArraySchema = z.array(oddsSchema);
export const scoreArraySchema = z.array(scoreSchema);

export type Fixture = z.infer<typeof fixtureSchema>;
export type Odds = z.infer<typeof oddsSchema>;
export type Score = z.infer<typeof scoreSchema>;
export type ProofNode = z.infer<typeof proofNodeSchema>;
export type ScoreStat = z.infer<typeof scoreStatSchema>;
export type ScoresBatchSummary = z.infer<typeof scoresBatchSummarySchema>;
export type ScoresStatValidation = z.infer<typeof scoresStatValidationSchema>;
