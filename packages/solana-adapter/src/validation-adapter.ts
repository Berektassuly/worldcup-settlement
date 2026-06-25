import type {
  NormalizedProofNode,
  NormalizedScoreProof,
  ProofOperation,
  ProofPredicate
} from "@worldcup-settlement/settlement";
import type { ScoresStatValidation } from "@worldcup-settlement/shared";
import { TXLINE_PDA_SEEDS, TXLINE_PROGRAM_IDS } from "./constants";

export type ValidationPredicate =
  | { readonly comparison: "greaterThan"; readonly threshold: number }
  | { readonly comparison: "lessThan"; readonly threshold: number }
  | { readonly comparison: "equalTo"; readonly threshold: number };

export type ValidateStatInput = {
  readonly validation: ScoresStatValidation;
  readonly normalizedProof: NormalizedScoreProof;
  readonly predicate: ValidationPredicate;
  readonly statKey: number;
  readonly statKey2?: number;
};

export type ValidateStatResult = {
  readonly ok: boolean;
  readonly network: "mainnet" | "devnet";
  readonly simulated: boolean;
  readonly signature?: string;
  readonly error?: string;
};

export type TxlineStatValidator = {
  validateStat(input: ValidateStatInput): Promise<ValidateStatResult>;
};

export type AnchorComparison =
  | { readonly greaterThan: Record<string, never> }
  | { readonly lessThan: Record<string, never> }
  | { readonly equalTo: Record<string, never> };

export type AnchorBinaryExpression =
  | { readonly add: Record<string, never> }
  | { readonly subtract: Record<string, never> };

export type AnchorProofNode = {
  readonly hash: readonly number[];
  readonly isRightSibling: boolean;
};

export type AnchorScoreStatTerm = {
  readonly statToProve: {
    readonly key: number;
    readonly value: number;
    readonly period: number;
  };
  readonly eventStatRoot: readonly number[];
  readonly statProof: readonly AnchorProofNode[];
};

export type AnchorValidateStatInput = {
  readonly programId: string;
  readonly network: "mainnet" | "devnet";
  readonly targetTs: number;
  readonly fixtureSummary: {
    readonly fixtureId: number;
    readonly updateStats: {
      readonly updateCount: number;
      readonly minTimestamp: number;
      readonly maxTimestamp: number;
    };
    readonly eventsSubTreeRoot: readonly number[];
  };
  readonly fixtureProof: readonly AnchorProofNode[];
  readonly mainTreeProof: readonly AnchorProofNode[];
  readonly predicate: {
    readonly threshold: number;
    readonly comparison: AnchorComparison;
  };
  readonly statA: AnchorScoreStatTerm;
  readonly statB: AnchorScoreStatTerm | null;
  readonly op: AnchorBinaryExpression | null;
  readonly dailyScoresPdaSeed: {
    readonly seed: typeof TXLINE_PDA_SEEDS.dailyScoresRoots;
    readonly epochDay: number;
    readonly epochDayLeBytes: readonly [number, number];
  };
};

export function buildAnchorValidateStatInput(input: {
  readonly proof: NormalizedScoreProof;
  readonly predicate: ProofPredicate;
  readonly operation?: ProofOperation;
  readonly network?: "mainnet" | "devnet";
}): AnchorValidateStatInput {
  const network = input.network ?? "devnet";
  const epochDay = Math.floor(input.proof.targetTs / 86_400_000);

  return {
    programId: TXLINE_PROGRAM_IDS[network],
    network,
    targetTs: input.proof.targetTs,
    fixtureSummary: {
      fixtureId: input.proof.summary.fixtureId,
      updateStats: input.proof.summary.updateStats,
      eventsSubTreeRoot: input.proof.summary.eventsSubTreeRoot
    },
    fixtureProof: toAnchorProofNodes(input.proof.fixtureProof),
    mainTreeProof: toAnchorProofNodes(input.proof.mainTreeProof),
    predicate: {
      threshold: input.predicate.threshold,
      comparison: toAnchorComparison(input.predicate.comparison)
    },
    statA: toAnchorStatTerm(input.proof.statA),
    statB: input.proof.statB ? toAnchorStatTerm(input.proof.statB) : null,
    op: input.operation ? toAnchorOperation(input.operation) : null,
    dailyScoresPdaSeed: {
      seed: TXLINE_PDA_SEEDS.dailyScoresRoots,
      epochDay,
      epochDayLeBytes: toU16Le(epochDay)
    }
  };
}

export function unavailableStatValidator(
  reason = "Anchor validation is not wired in this MVP build."
): TxlineStatValidator {
  return {
    async validateStat(): Promise<ValidateStatResult> {
      return {
        ok: false,
        network: "devnet",
        simulated: false,
        error: reason
      };
    }
  };
}

function toAnchorProofNodes(nodes: readonly NormalizedProofNode[]): AnchorProofNode[] {
  return nodes.map((node) => ({
    hash: node.hash,
    isRightSibling: node.isRightSibling
  }));
}

function toAnchorStatTerm(term: NormalizedScoreProof["statA"]): AnchorScoreStatTerm {
  return {
    statToProve: term.statToProve,
    eventStatRoot: term.eventStatRoot,
    statProof: toAnchorProofNodes(term.statProof)
  };
}

function toAnchorComparison(comparison: ProofPredicate["comparison"]): AnchorComparison {
  if (comparison === "greaterThan") {
    return { greaterThan: {} };
  }

  if (comparison === "lessThan") {
    return { lessThan: {} };
  }

  return { equalTo: {} };
}

function toAnchorOperation(operation: ProofOperation): AnchorBinaryExpression {
  return operation === "add" ? { add: {} } : { subtract: {} };
}

function toU16Le(value: number): readonly [number, number] {
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error(`Value ${value} cannot be encoded as u16 little-endian bytes`);
  }

  return [value & 0xff, (value >> 8) & 0xff];
}
