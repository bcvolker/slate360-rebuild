import { NextRequest, NextResponse } from "next/server";
import { getMarketResolution } from "@/lib/market/polymarket";
import type { ApiEnvelope } from "@/lib/market/contracts";
import type { MarketResolution } from "@/lib/market/polymarket";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("market_id");
  if (!marketId) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_MARKET_ID", message: "market_id query param required" } } satisfies ApiEnvelope<never>,
      { status: 400 }
    );
  }

  try {
    const resolution = await getMarketResolution(marketId);
    return NextResponse.json({ ok: true, data: resolution } satisfies ApiEnvelope<MarketResolution>);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: "RESOLUTION_ERROR", message: e instanceof Error ? e.message : "Failed to fetch resolution info" } } satisfies ApiEnvelope<never>,
      { status: 502 }
    );
  }
}
