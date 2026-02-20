/**
 * GET /api/market/trades
 *
 * Fetch trade history for the authenticated user.
 * Used by the MarketClient activity table.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const offset = parseInt(url.searchParams.get("offset") ?? "0");

    const { data: trades, error } = await supabase
      .from("market_trades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate daily P&L
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl, total")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnl =
      todayTrades?.reduce((sum, t) => sum + (t.pnl ?? 0), 0) ?? 0;
    const dailyVolume =
      todayTrades?.reduce((sum, t) => sum + (t.total ?? 0), 0) ?? 0;

    return NextResponse.json({
      trades: trades ?? [],
      dailyPnl,
      dailyVolume,
      count: trades?.length ?? 0,
    });
  } catch (err) {
    console.error("[api/market/trades]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch trades" },
      { status: 500 },
    );
  }
}
