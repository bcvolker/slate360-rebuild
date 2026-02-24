/**
 * GET  /api/market/trades  — fetch trade history
 * POST /api/market/trades  — save a direct buy (paper or live)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import { toNumberOrNull, toNumberOrZero } from "@/lib/market/contracts";
import { mapTradeRowToTradeVM } from "@/lib/market/mappers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TRADE_COLUMNS = [
  "id",
  "user_id",
  "market_id",
  "question",
  "side",
  "shares",
  "price",
  "total",
  "status",
  "pnl",
  "paper_trade",
  "reason",
  "created_at",
  "closed_at",
].join(",");

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const { data: trades, error } = await supabase
      .from("market_trades")
      .select(TRADE_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return noStoreJson(
        { ok: false, error: { code: "trades_fetch_failed", message: error.message } },
        { status: 500 }
      );
    }

    // Calculate daily P&L
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl, total")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnlUsd = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.pnl), 0) ?? 0;
    const dailyVolumeUsd = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.total), 0) ?? 0;
    const mappedTrades: TradeViewModel[] = (trades ?? []).map((row) => mapTradeRowToTradeVM(row));

    return noStoreJson({
      ok: true,
      data: {
        trades: mappedTrades,
      },
      meta: {
        timestamp: new Date().toISOString(),
        summary: {
          dailyPnlUsd,
          dailyVolumeUsd,
          count: mappedTrades.length,
        },
      },
    });
  } catch (err) {
    console.error("[api/market/trades]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "trades_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to fetch trades",
        },
      },
      { status: 500 }
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
    if (!user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }

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

    const normalizedAmount = toNumberOrNull(amount);
    const normalizedAvgPrice = toNumberOrNull(avg_price);
    const normalizedOutcome = String(outcome ?? "").toUpperCase();

    if (!market_id || !market_title || !normalizedOutcome || normalizedAmount === null || normalizedAvgPrice === null) {
      return noStoreJson({ ok: false, error: { code: "invalid_payload", message: "Missing required fields" } }, { status: 400 });
    }
    if (normalizedOutcome !== "YES" && normalizedOutcome !== "NO") {
      return noStoreJson({ ok: false, error: { code: "invalid_outcome", message: "Outcome must be YES or NO" } }, { status: 400 });
    }
    if (normalizedAmount <= 0 || normalizedAvgPrice <= 0) {
      return noStoreJson(
        { ok: false, error: { code: "invalid_numeric_values", message: "Amount and avg_price must be positive" } },
        { status: 400 }
      );
    }

    const shares = parseFloat((normalizedAmount / normalizedAvgPrice).toFixed(4));
    const total  = parseFloat((normalizedAmount).toFixed(2));

    const { data, error } = await supabase.from("market_trades").insert({
      user_id:      user.id,
      market_id,
      question:     market_title,      // maps to the 'question' column
      side:         normalizedOutcome, // maps to the 'side' column
      shares,
      price:        normalizedAvgPrice, // maps to the 'price' column
      total,
      status:       "open",
      pnl:          0,
      paper_trade:  paper_mode,
      reason:       `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
    }).select(TRADE_COLUMNS).single();

    if (error) {
      return noStoreJson(
        { ok: false, error: { code: "trade_insert_failed", message: error.message } },
        { status: 500 }
      );
    }

    return noStoreJson({
      ok: true,
      data: {
        trade: mapTradeRowToTradeVM(data),
      },
    });
  } catch (err) {
    console.error("[api/market/trades POST]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "trade_post_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to save trade",
        },
      },
      { status: 500 }
    );
  }
}
