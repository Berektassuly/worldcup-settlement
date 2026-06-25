import { normalizeScoresProof } from "@worldcup-settlement/settlement";
import type { ScoresStatValidation } from "@worldcup-settlement/shared";
import { describe, expect, it } from "vitest";
import { TXLINE_PROGRAM_IDS, TXLINE_PDA_SEEDS } from "./constants";
import { buildAnchorValidateStatInput } from "./validation-adapter";

describe("anchor validation adapter", () => {
  it("builds Anchor-ready validateStat input without signing transactions", () => {
    const proof = normalizeScoresProof(validationFixture());
    const anchorInput = buildAnchorValidateStatInput({
      proof,
      network: "devnet",
      operation: "subtract",
      predicate: { comparison: "greaterThan", threshold: 0 }
    });

    const expectedEpochDay = Math.floor(proof.targetTs / 86_400_000);

    expect(anchorInput.programId).toBe(TXLINE_PROGRAM_IDS.devnet);
    expect(anchorInput.dailyScoresPdaSeed.seed).toBe(TXLINE_PDA_SEEDS.dailyScoresRoots);
    expect(anchorInput.dailyScoresPdaSeed.epochDay).toBe(expectedEpochDay);
    expect(anchorInput.dailyScoresPdaSeed.epochDayLeBytes).toEqual([
      expectedEpochDay & 0xff,
      (expectedEpochDay >> 8) & 0xff
    ]);
    expect(anchorInput.fixtureSummary.eventsSubTreeRoot).toHaveLength(32);
    expect(anchorInput.predicate.comparison).toEqual({ greaterThan: {} });
    expect(anchorInput.op).toEqual({ subtract: {} });
    expect(anchorInput.statB?.statToProve.key).toBe(2);
  });
});

function validationFixture(): ScoresStatValidation {
  return {
    ts: 1_771_000_030_000,
    statToProve: { key: 1, value: 2, period: 0 },
    statToProve2: { key: 2, value: 1, period: 0 },
    eventStatRoot: "11".repeat(32),
    summary: {
      fixtureId: 17588227,
      updateStats: {
        updateCount: 4,
        minTimestamp: 1_771_000_000_000,
        maxTimestamp: 1_771_000_060_000
      },
      eventsSubTreeRoot: "22".repeat(32)
    },
    statProof: proofNodes("33"),
    statProof2: proofNodes("44"),
    subTreeProof: proofNodes("55"),
    mainTreeProof: proofNodes("66")
  };
}

function proofNodes(hexByte: string) {
  return [
    {
      hash: hexByte.repeat(32),
      isRightSibling: false
    }
  ];
}
