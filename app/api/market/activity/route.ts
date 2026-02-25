import { NextRequest, NextResponse } from "next/server";
import { getMarketActivity } from "@/lib/market/polymarket";
import type { ApiEnvelope } from "@/lib/market/contracts";
import type { ActivityItem } from "@/lib/market/polymarket";

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get("token_id");
  if (!tokenId) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_TOKEN_ID", message: "token_id query param required" } } satisfies ApiEnvelope<never>,
      { status: 400 }
    );
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

  try {
    const items = await getMarketActivity(tokenId, limit);
    return NextResponse.json({ ok: true, data: { activity: items } } satisfies ApiEnvelope<{ activity: ActivityItem[] }>);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: "ACTIVITY_ERROR", message: e instanceof Error ? e.message : "Failed to fetch activity" } } satisfies ApiEnvelope<never>,
      { status: 502 }
    );
  }
}
