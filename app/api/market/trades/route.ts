/**
 * GET  /api/market/trades  — fetch trade history
 * POST /api/market/trades  — save a direct buy (paper or live)
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

/**
 * POST /api/market/trades
 * Save a direct buy to market_trades (paper or live).
 * Body: { market_id, market_title, outcome, amount, avg_price, category, probability, paper_mode }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      market_id,
      market_title,
      outcome,
      amount,        // USDC to spend
      avg_price,     // price per share (0-1)
      category,
      probability,
      paper_mode = true,
    } = body;

    if (!market_id || !market_title || !outcome || !amount || !avg_price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shares = parseFloat((amount / avg_price).toFixed(4));
    const total  = parseFloat((amount).toFixed(2));

    const { data, error } = await supabase.from("market_trades").insert({
      user_id:      user.id,
      market_id,
      question:     market_title,      // maps to the 'question' column
      side:         outcome,           // maps to the 'side' column
      shares,
      price:        avg_price,         // maps to the 'price' column
      total,
      status:       "open",
      pnl:          0,
      paper_trade:  paper_mode,
      reason:       `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ trade: data, success: true });
  } catch (err) {
    console.error("[api/market/trades POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save trade" },
      { status: 500 },
    );
  }
}
