import type { ProofNode, ScoresStatValidation } from "@worldcup-settlement/shared";

export type Bytes32 = readonly number[] & { readonly __bytes32: unique symbol };

export type NormalizedProofNode = {
  readonly hash: Bytes32;
  readonly isRightSibling: boolean;
};

export type NormalizedScoreProof = {
  readonly ts: number;
  readonly statProof: readonly NormalizedProofNode[];
  readonly fixtureProof: readonly NormalizedProofNode[];
  readonly mainTreeProof: readonly NormalizedProofNode[];
  readonly eventStatRoot: Bytes32;
  readonly eventsSubTreeRoot: Bytes32;
};

export function normalizeScoresProof(validation: ScoresStatValidation): NormalizedScoreProof {
  return {
    ts: validation.ts,
    statProof: normalizeProofNodes(validation.statProof),
    fixtureProof: normalizeProofNodes(validation.subTreeProof),
    mainTreeProof: normalizeProofNodes(validation.mainTreeProof),
    eventStatRoot: toBytes32(validation.eventStatRoot),
    eventsSubTreeRoot: toBytes32(validation.summary.eventsSubTreeRoot)
  };
}

export function normalizeProofNodes(nodes: readonly ProofNode[]): NormalizedProofNode[] {
  return nodes.map((node) => ({
    hash: toBytes32(node.hash),
    isRightSibling: node.isRightSibling
  }));
}

export function toBytes32(value: string | readonly number[] | Uint8Array): Bytes32 {
  const bytes = valueToBytes(value);

  if (bytes.length !== 32) {
    throw new Error(`Expected 32 bytes, received ${bytes.length}`);
  }

  return Array.from(bytes) as unknown as Bytes32;
}

function valueToBytes(value: string | readonly number[] | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (typeof value !== "string") {
    return Uint8Array.from(value);
  }

  if (value.startsWith("0x")) {
    return hexToBytes(value.slice(2));
  }

  return base64ToBytes(value);
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must contain an even number of characters");
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
