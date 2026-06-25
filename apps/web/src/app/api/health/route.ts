import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "worldcup-settlement-web",
    txlineConfigured: Boolean(process.env.TXLINE_JWT && process.env.TXLINE_API_TOKEN)
  });
}
