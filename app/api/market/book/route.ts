import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/market/polymarket";
import type { ApiEnvelope } from "@/lib/market/contracts";
import type { OrderBookSnapshot } from "@/lib/market/polymarket";

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get("token_id");
  if (!tokenId) {
    return NextResponse.json(
      { ok: false, error: { code: "MISSING_TOKEN_ID", message: "token_id query param required" } } satisfies ApiEnvelope<never>,
      { status: 400 }
    );
  }

  try {
    const book = await getOrderBook(tokenId);
    return NextResponse.json({ ok: true, data: book } satisfies ApiEnvelope<OrderBookSnapshot>);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: "BOOK_ERROR", message: e instanceof Error ? e.message : "Failed to fetch order book" } } satisfies ApiEnvelope<never>,
      { status: 502 }
    );
  }
}
