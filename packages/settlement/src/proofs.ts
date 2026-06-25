import type {
  ProofNode,
  ScoresBatchSummary,
  ScoresStatValidation,
  ScoreStat
} from "@worldcup-settlement/shared";

export type Bytes32 = readonly number[] & { readonly __bytes32: unique symbol };

export type HashInput = string | readonly number[] | Uint8Array;

export type NormalizedProofNode = {
  readonly hash: Bytes32;
  readonly isRightSibling: boolean;
};

export type NormalizedScoreStatTerm = {
  readonly statToProve: ScoreStat;
  readonly eventStatRoot: Bytes32;
  readonly statProof: readonly NormalizedProofNode[];
};

export type NormalizedScoresBatchSummary = Omit<ScoresBatchSummary, "eventsSubTreeRoot"> & {
  readonly eventsSubTreeRoot: Bytes32;
};

export type NormalizedScoreProof = {
  readonly payloadTs: number;
  readonly targetTs: number;
  readonly summary: NormalizedScoresBatchSummary;
  readonly statA: NormalizedScoreStatTerm;
  readonly statB?: NormalizedScoreStatTerm;
  readonly fixtureProof: readonly NormalizedProofNode[];
  readonly mainTreeProof: readonly NormalizedProofNode[];
};

export type ProofPredicate = {
  readonly comparison: "greaterThan" | "lessThan" | "equalTo";
  readonly threshold: number;
};

export type ProofOperation = "add" | "subtract";

export type ProofEvaluation = {
  readonly ok: boolean;
  readonly computedValue: number;
  readonly predicate: ProofPredicate;
  readonly operation?: ProofOperation;
};

export function normalizeScoresProof(validation: ScoresStatValidation): NormalizedScoreProof {
  const eventStatRoot = toBytes32(validation.eventStatRoot);

  return {
    payloadTs: validation.ts,
    targetTs: validation.summary.updateStats.minTimestamp,
    summary: {
      ...validation.summary,
      eventsSubTreeRoot: toBytes32(validation.summary.eventsSubTreeRoot)
    },
    statA: {
      statToProve: validation.statToProve,
      eventStatRoot,
      statProof: normalizeProofNodes(validation.statProof)
    },
    statB:
      validation.statToProve2 && validation.statProof2
        ? {
            statToProve: validation.statToProve2,
            eventStatRoot,
            statProof: normalizeProofNodes(validation.statProof2)
          }
        : undefined,
    fixtureProof: normalizeProofNodes(validation.subTreeProof),
    mainTreeProof: normalizeProofNodes(validation.mainTreeProof)
  };
}

export function normalizeProofNodes(nodes: readonly ProofNode[]): NormalizedProofNode[] {
  return nodes.map((node) => ({
    hash: toBytes32(node.hash),
    isRightSibling: node.isRightSibling
  }));
}

export function evaluateProofPredicate(
  validation: ScoresStatValidation,
  predicate: ProofPredicate,
  operation?: ProofOperation
): ProofEvaluation {
  const computedValue = computeStatValue(validation, operation);
  return {
    ok: compare(computedValue, predicate),
    computedValue,
    predicate,
    operation
  };
}

export function computeStatValue(
  validation: Pick<ScoresStatValidation, "statToProve" | "statToProve2">,
  operation?: ProofOperation
): number {
  if (!operation) {
    return validation.statToProve.value;
  }

  if (!validation.statToProve2) {
    throw new Error(`Operation ${operation} requires a second stat`);
  }

  if (operation === "add") {
    return validation.statToProve.value + validation.statToProve2.value;
  }

  return validation.statToProve.value - validation.statToProve2.value;
}

export function toBytes32(value: HashInput): Bytes32 {
  const bytes = valueToBytes(value);

  if (bytes.length !== 32) {
    throw new Error(`Expected 32 bytes, received ${bytes.length}`);
  }

  return Array.from(bytes) as unknown as Bytes32;
}

function compare(value: number, predicate: ProofPredicate): boolean {
  switch (predicate.comparison) {
    case "greaterThan":
      return value > predicate.threshold;
    case "lessThan":
      return value < predicate.threshold;
    case "equalTo":
      return value === predicate.threshold;
    default:
      return assertNever(predicate.comparison);
  }
}

function valueToBytes(value: HashInput): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (typeof value !== "string") {
    return arrayToBytes(value);
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("0x")) {
    return hexToBytes(trimmed.slice(2));
  }

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return hexToBytes(trimmed);
  }

  return base64ToBytes(trimmed);
}

function arrayToBytes(values: readonly number[]): Uint8Array {
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error("Byte arrays must contain integers between 0 and 255");
    }
  }

  return Uint8Array.from(values);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must contain an even number of characters");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);

    if (!Number.isInteger(byte)) {
      throw new Error("Hex string contained a non-hex character");
    }

    bytes[index] = byte;
  }

  return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = normalizeBase64(base64);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function normalizeBase64(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;

  if (padding === 0) {
    return normalized;
  }

  return `${normalized}${"=".repeat(4 - padding)}`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported predicate comparison: ${value}`);
}
