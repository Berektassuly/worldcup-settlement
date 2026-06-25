import {
  scorelineFromScoreUpdates,
  type SoccerScoreline
} from "@worldcup-settlement/domain";
import { TxlineClient } from "@worldcup-settlement/txline-client";
import type { Fixture, Odds } from "@worldcup-settlement/shared";
import { NextResponse } from "next/server";
import type { DemoFixtureRecord, DemoFixturesResponse } from "@/lib/demo-types";
import { replayFixturesResponse } from "@/lib/replay-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;

  if (!jwt || !apiToken) {
    return json(
      replayFixturesResponse("TxLINE credentials are not configured; using replay data.")
    );
  }

  const url = new URL(request.url);
  const limit = boundedLimit(url.searchParams.get("limit") ?? process.env.TXLINE_FIXTURE_LIMIT);
  const startEpochDay = url.searchParams.get("startEpochDay");

  try {
    const client = new TxlineClient({
      baseUrl: process.env.TXLINE_BASE_URL,
      credentials: { jwt, apiToken }
    });

    const fixtures = await client.getFixturesSnapshot({
      startEpochDay: startEpochDay ? Number(startEpochDay) : undefined
    });

    const records = await Promise.all(
      fixtures.slice(0, limit).map((fixture) => toRecord(client, fixture))
    );

    if (records.length === 0) {
      return json(replayFixturesResponse("TxLINE returned no fixtures; using replay data."));
    }

    return json({
      mode: "txline",
      reason: "Loaded live TxLINE fixture data.",
      fixtures: records
    });
  } catch {
    return json(replayFixturesResponse("TxLINE data is unavailable right now; using replay data."));
  }
}

async function toRecord(client: TxlineClient, fixture: Fixture): Promise<DemoFixtureRecord> {
  const [scoresResult, oddsResult] = await Promise.allSettled([
    client.getScoresSnapshot(fixture.FixtureId),
    client.getOddsSnapshot(fixture.FixtureId)
  ]);

  const scoreline =
    scoresResult.status === "fulfilled"
      ? scorelineFromScoreUpdates(scoresResult.value) ?? emptyScoreline()
      : emptyScoreline();

  const latestOdds: readonly Odds[] =
    oddsResult.status === "fulfilled" ? oddsResult.value.slice(0, 4) : [];

  return {
    fixture,
    scoreline,
    latestOdds,
    sourceNote:
      scoresResult.status === "fulfilled"
        ? "Current score data came from TxLINE."
        : "Fixture loaded from TxLINE; no score snapshot was available."
  };
}

function emptyScoreline(): SoccerScoreline {
  return {
    participant1Goals: 0,
    participant2Goals: 0,
    status: "not_started",
    sourceLabel: "Fixture snapshot"
  };
}

function boundedLimit(raw: string | null | undefined): number {
  const value = raw ? Number(raw) : 8;
  if (!Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.min(12, Math.trunc(value)));
}

function json(body: DemoFixturesResponse) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
