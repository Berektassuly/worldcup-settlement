import { scoresStatValidationSchema, type ScoresStatValidation } from "@worldcup-settlement/shared";
import { describe, expect, it } from "vitest";
import {
  computeStatValue,
  evaluateProofPredicate,
  normalizeScoresProof,
  toBytes32
} from "./proofs";

describe("proof normalization", () => {
  it("normalizes proof hashes into 32-byte arrays", () => {
    const validation = validationFixture({
      statA: 2,
      statB: 1,
      eventStatRoot: `0x${"11".repeat(32)}`,
      eventsSubTreeRoot: "22".repeat(32)
    });

    const normalized = normalizeScoresProof(validation);

    expect(normalized.targetTs).toBe(1_771_000_000_000);
    expect(normalized.summary.eventsSubTreeRoot).toHaveLength(32);
    expect(normalized.summary.eventsSubTreeRoot[0]).toBe(0x22);
    expect(normalized.statA.eventStatRoot).toHaveLength(32);
    expect(normalized.statB?.statToProve.value).toBe(1);
    expect(normalized.fixtureProof[0]?.hash).toHaveLength(32);
    expect(normalized.mainTreeProof[0]?.isRightSibling).toBe(false);
  });

  it("supports the OpenAPI eventStatsSubTreeRoot field name", () => {
    const parsed = scoresStatValidationSchema.parse({
      ...validationFixture({ statA: 2 }),
      summary: {
        fixtureId: 17588227,
        updateStats: {
          updateCount: 4,
          minTimestamp: 1_771_000_000_000,
          maxTimestamp: 1_771_000_060_000
        },
        eventStatsSubTreeRoot: "33".repeat(32)
      }
    });

    expect(parsed.summary.eventsSubTreeRoot).toBe("33".repeat(32));
  });

  it("evaluates single-stat and two-stat predicates deterministically", () => {
    const validation = validationFixture({ statA: 2, statB: 1 });

    expect(computeStatValue(validation, "subtract")).toBe(1);
    expect(computeStatValue(validation, "add")).toBe(3);
    expect(
      evaluateProofPredicate(validation, { comparison: "greaterThan", threshold: 0 }, "subtract")
    ).toMatchObject({ ok: true, computedValue: 1 });
    expect(
      evaluateProofPredicate(validation, { comparison: "lessThan", threshold: 3 }, "add")
    ).toMatchObject({ ok: false, computedValue: 3 });
  });

  it("rejects malformed byte arrays", () => {
    expect(() => toBytes32([256, ...Array.from({ length: 31 }, () => 0)])).toThrow(
      "Byte arrays must contain integers between 0 and 255"
    );
    expect(() => toBytes32("0x1234")).toThrow("Expected 32 bytes");
  });
});

function validationFixture(input: {
  readonly statA: number;
  readonly statB?: number;
  readonly eventStatRoot?: string;
  readonly eventsSubTreeRoot?: string;
}): ScoresStatValidation {
  return {
    ts: 1_771_000_030_000,
    statToProve: {
      key: 1,
      value: input.statA,
      period: 0
    },
    eventStatRoot: input.eventStatRoot ?? "44".repeat(32),
    summary: {
      fixtureId: 17588227,
      updateStats: {
        updateCount: 4,
        minTimestamp: 1_771_000_000_000,
        maxTimestamp: 1_771_000_060_000
      },
      eventsSubTreeRoot: input.eventsSubTreeRoot ?? "55".repeat(32)
    },
    statProof: proofNodes("66"),
    subTreeProof: proofNodes("77"),
    mainTreeProof: proofNodes("88", false),
    statToProve2:
      input.statB === undefined
        ? undefined
        : {
            key: 2,
            value: input.statB,
            period: 0
          },
    statProof2: input.statB === undefined ? undefined : proofNodes("99")
  };
}

function proofNodes(hexByte: string, isRightSibling = true) {
  return [
    {
      hash: hexByte.repeat(32),
      isRightSibling
    }
  ];
}
