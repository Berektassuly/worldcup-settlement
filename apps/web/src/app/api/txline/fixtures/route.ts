import { TxlineClient } from "@worldcup-settlement/txline-client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;

  if (!jwt || !apiToken) {
    return NextResponse.json(
      {
        error: "TxLINE credentials are not configured",
        requiredEnv: ["TXLINE_JWT", "TXLINE_API_TOKEN"]
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const competitionId = url.searchParams.get("competitionId");
  const startEpochDay = url.searchParams.get("startEpochDay");

  const client = new TxlineClient({
    baseUrl: process.env.TXLINE_BASE_URL,
    credentials: { jwt, apiToken }
  });

  const fixtures = await client.getFixturesSnapshot({
    competitionId: competitionId ? Number(competitionId) : undefined,
    startEpochDay: startEpochDay ? Number(startEpochDay) : undefined
  });

  return NextResponse.json({ fixtures });
}
