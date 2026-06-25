import type { ScoresStatValidation, ScoreStat } from "@worldcup-settlement/shared";
import { replayFixtureRecords } from "./replay-data";

export type ReplayProofRequest = {
  readonly fixtureId: number;
  readonly seq: number;
  readonly statKey: number;
  readonly statKey2?: number;
};

export function replayScoreStatValidation(
  request: ReplayProofRequest
): ScoresStatValidation | null {
  const record = replayFixtureRecords.find(
    (candidate) =>
      candidate.fixture.FixtureId === request.fixtureId &&
      candidate.scoreline.sourceSeq === request.seq
  );

  if (!record) {
    return null;
  }

  const statToProve = statForKey(request.statKey, record.scoreline);
  const statToProve2 =
    request.statKey2 === undefined
      ? undefined
      : statForKey(request.statKey2, record.scoreline) ?? undefined;

  if (!statToProve || (request.statKey2 !== undefined && !statToProve2)) {
    return null;
  }

  const sourceTs = record.scoreline.sourceTs ?? record.fixture.StartTime;
  const batchStartTs = sourceTs - 30_000;

  return {
    ts: sourceTs,
    statToProve,
    statToProve2,
    eventStatRoot: bytes(`event:${request.fixtureId}:${request.seq}`),
    summary: {
      fixtureId: request.fixtureId,
      updateStats: {
        updateCount: 1,
        minTimestamp: batchStartTs,
        maxTimestamp: sourceTs
      },
      eventsSubTreeRoot: bytes(`fixture:${request.fixtureId}:${request.seq}`)
    },
    statProof: proofNodes(`stat-a:${request.fixtureId}:${request.seq}:${request.statKey}`),
    statProof2: statToProve2
      ? proofNodes(`stat-b:${request.fixtureId}:${request.seq}:${request.statKey2}`)
      : undefined,
    subTreeProof: proofNodes(`subtree:${request.fixtureId}:${request.seq}`),
    mainTreeProof: proofNodes(`main:${request.fixtureId}:${request.seq}`, false)
  };
}

function statForKey(
  statKey: number,
  scoreline: (typeof replayFixtureRecords)[number]["scoreline"]
): ScoreStat | null {
  if (statKey === 1) {
    return {
      key: 1,
      value: scoreline.participant1Goals,
      period: 0
    };
  }

  if (statKey === 2) {
    return {
      key: 2,
      value: scoreline.participant2Goals,
      period: 0
    };
  }

  return null;
}

function proofNodes(seed: string, isRightSibling = true) {
  return [
    {
      hash: bytes(`${seed}:0`),
      isRightSibling
    },
    {
      hash: bytes(`${seed}:1`),
      isRightSibling: !isRightSibling
    }
  ];
}

function bytes(seed: string): number[] {
  const output: number[] = [];

  for (let index = 0; index < 32; index += 1) {
    const charCode = seed.charCodeAt(index % seed.length);
    output.push((charCode + index * 17 + seed.length * 13) % 256);
  }

  return output;
}
