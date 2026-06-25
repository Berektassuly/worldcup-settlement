import {
  evaluateProofPredicate,
  normalizeScoresProof,
  type ProofPredicate
} from "@worldcup-settlement/settlement";
import { buildAnchorValidateStatInput } from "@worldcup-settlement/solana-adapter";
import type { ScoresStatValidation } from "@worldcup-settlement/shared";
import { TxlineClient } from "@worldcup-settlement/txline-client";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { DemoDataMode, DemoProofResponse } from "@/lib/demo-types";
import { replayScoreStatValidation } from "@/lib/replay-proofs";

export const dynamic = "force-dynamic";

const proofRequestSchema = z.object({
  fixtureId: z.coerce.number().int().positive(),
  seq: z.coerce.number().int().nonnegative(),
  statKey: z.coerce.number().int().positive(),
  statKey2: z.coerce.number().int().positive().optional(),
  comparison: z.enum(["greaterThan", "lessThan", "equalTo"]),
  threshold: z.coerce.number().int(),
  op: z.enum(["add", "subtract"]).optional()
});

export async function GET(request: Request) {
  const parsed = parseProofRequest(request);

  if (!parsed.success) {
    return NextResponse.json(
      {
        mode: "replay",
        status: "unavailable",
        reason: parsed.error
      },
      { status: 400 }
    );
  }

  const proofRequest = parsed.value;
  const predicate: ProofPredicate = {
    comparison: proofRequest.comparison,
    threshold: proofRequest.threshold
  };

  const liveProof = await fetchLiveProof(proofRequest);
  const replayProof = liveProof.validation
    ? null
    : replayScoreStatValidation(proofRequest);
  const validation = liveProof.validation ?? replayProof;

  if (!validation) {
    return json({
      mode: "replay",
      status: "unavailable",
      reason:
        liveProof.reason ??
        "No proof payload is available for this fixture, sequence, and stat request.",
      sourceSeq: proofRequest.seq,
      request: {
        ...proofRequest,
        comparison: predicate.comparison,
        threshold: predicate.threshold
      }
    });
  }

  try {
    const normalized = normalizeScoresProof(validation);
    const evaluation = evaluateProofPredicate(validation, predicate, proofRequest.op);
    const anchorInput = buildAnchorValidateStatInput({
      proof: normalized,
      predicate,
      operation: proofRequest.op,
      network: process.env.TXLINE_NETWORK === "mainnet" ? "mainnet" : "devnet"
    });
    const mode: DemoDataMode = liveProof.validation ? "txline" : "replay";
    const status = evaluation.ok ? "available" : "predicate_failed";

    return json({
      mode,
      status,
      reason:
        mode === "txline"
          ? "TxLINE proof payload loaded and normalized. On-chain Anchor validation is prepared but not executed in this MVP."
          : "Replay proof payload loaded because live TxLINE proof data is unavailable.",
      sourceSeq: proofRequest.seq,
      request: {
        ...proofRequest,
        comparison: predicate.comparison,
        threshold: predicate.threshold
      },
      validation: {
        payloadTs: normalized.payloadTs,
        targetTs: normalized.targetTs,
        fixtureId: normalized.summary.fixtureId,
        statA: normalized.statA.statToProve,
        statB: normalized.statB?.statToProve,
        proofNodeCounts: {
          statA: normalized.statA.statProof.length,
          statB: normalized.statB?.statProof.length,
          fixture: normalized.fixtureProof.length,
          main: normalized.mainTreeProof.length
        }
      },
      evaluation,
      anchorInput,
      raw: validation
    });
  } catch (error) {
    return json({
      mode: liveProof.validation ? "txline" : "replay",
      status: "unavailable",
      reason:
        error instanceof Error
          ? `Proof payload could not be normalized: ${error.message}`
          : "Proof payload could not be normalized.",
      sourceSeq: proofRequest.seq,
      request: {
        ...proofRequest,
        comparison: predicate.comparison,
        threshold: predicate.threshold
      }
    });
  }
}

function parseProofRequest(
  request: Request
):
  | {
      readonly success: true;
      readonly value: z.infer<typeof proofRequestSchema>;
    }
  | {
      readonly success: false;
      readonly error: string;
    } {
  const params = new URL(request.url).searchParams;
  const parsed = proofRequestSchema.safeParse({
    fixtureId: params.get("fixtureId"),
    seq: params.get("seq"),
    statKey: params.get("statKey"),
    statKey2: params.get("statKey2") ?? undefined,
    comparison: params.get("comparison"),
    threshold: params.get("threshold"),
    op: params.get("op") ?? undefined
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; ")
    };
  }

  return {
    success: true,
    value: parsed.data
  };
}

async function fetchLiveProof(
  request: z.infer<typeof proofRequestSchema>
): Promise<{ readonly validation?: ScoresStatValidation; readonly reason?: string }> {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;

  if (!jwt || !apiToken) {
    return {
      reason: "TxLINE credentials are not configured."
    };
  }

  try {
    const client = new TxlineClient({
      baseUrl: process.env.TXLINE_BASE_URL,
      credentials: { jwt, apiToken }
    });

    return {
      validation: await client.getScoreStatValidation(request)
    };
  } catch (error) {
    return {
      reason:
        error instanceof Error
          ? `TxLINE proof request failed: ${error.message}`
          : "TxLINE proof request failed."
    };
  }
}

function json(body: DemoProofResponse) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
