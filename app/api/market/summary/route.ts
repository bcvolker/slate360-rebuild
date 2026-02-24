import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiEnvelope, MarketSummaryViewModel } from "@/lib/market/contracts";
import { toNumberOrZero } from "@/lib/market/contracts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

type SummaryTradeRow = {
  status: string | null;
  pnl: number | string | null;
  total: number | string | null;
  created_at: string | null;
  paper_trade: boolean | null;
};

function toUtcDay(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const [{ data: trades, error: tradesError }, { data: directives }, { data: runtime }, { data: runtimeState }] = await Promise.all([
      supabase
        .from("market_trades")
        .select("status,pnl,total,created_at,paper_trade")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("market_directives")
        .select("amount,paper_mode,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("market_bot_runtime")
        .select("updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("market_bot_runtime_state")
        .select("last_run_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (tradesError) {
      return noStoreJson(
        { ok: false, error: { code: "summary_fetch_failed", message: tradesError.message } },
        { status: 500 }
      );
    }

    const tradeRows: SummaryTradeRow[] = (trades ?? []) as SummaryTradeRow[];

    const userConfig = (user.user_metadata?.marketBotConfig ?? {}) as {
      paperMode?: boolean;
      startingBalanceUsd?: number | string;
    };

    const latestDirective = directives?.[0] as
      | { amount?: number | string | null; paper_mode?: boolean | null }
      | undefined;

    const mode: "paper" | "live" =
      typeof userConfig.paperMode === "boolean"
        ? userConfig.paperMode
          ? "paper"
          : "live"
        : typeof latestDirective?.paper_mode === "boolean"
          ? latestDirective.paper_mode
            ? "paper"
            : "live"
          : tradeRows.some((trade) => trade.paper_trade === false)
            ? "live"
            : "paper";

    const startingBalanceUsd =
      toNumberOrZero(userConfig.startingBalanceUsd) > 0
        ? toNumberOrZero(userConfig.startingBalanceUsd)
        : toNumberOrZero(latestDirective?.amount) > 0
          ? toNumberOrZero(latestDirective?.amount)
          : 1000;

    const closedTrades = tradeRows.filter((trade) => String(trade.status ?? "").toLowerCase() === "closed");
    const pnlReference = closedTrades.length > 0 ? closedTrades : tradeRows;

    const totalProfitLossUsd = pnlReference.reduce((sum, trade) => sum + toNumberOrZero(trade.pnl), 0);

    const todayUtc = new Date().toISOString().slice(0, 10);
    const todayProfitLossUsd = tradeRows.reduce((sum, trade) => {
      if (!trade.created_at) return sum;
      return toUtcDay(trade.created_at) === todayUtc ? sum + toNumberOrZero(trade.pnl) : sum;
    }, 0);

    const openTrades = tradeRows.filter((trade) => String(trade.status ?? "").toLowerCase() === "open");
    const openExposureUsd = openTrades.reduce((sum, trade) => sum + Math.max(0, toNumberOrZero(trade.total)), 0);

    const currentBalanceUsd = startingBalanceUsd + totalProfitLossUsd;
    const availableCashUsd = Math.max(0, currentBalanceUsd - openExposureUsd);

    const wins = pnlReference.filter((trade) => toNumberOrZero(trade.pnl) > 0).length;
    const winRatePct = pnlReference.length > 0 ? (wins / pnlReference.length) * 100 : 0;

    const averageTradeUsd =
      tradeRows.length > 0
        ? tradeRows.reduce((sum, trade) => sum + Math.max(0, toNumberOrZero(trade.total)), 0) / tradeRows.length
        : 0;

    const averageProfitUsd = pnlReference.length > 0 ? totalProfitLossUsd / pnlReference.length : 0;

    const dayTotals = new Map<string, number>();
    for (const trade of tradeRows) {
      if (!trade.created_at) continue;
      const key = toUtcDay(trade.created_at);
      if (!key) continue;
      dayTotals.set(key, (dayTotals.get(key) ?? 0) + toNumberOrZero(trade.pnl));
    }
    const dayPnlValues = Array.from(dayTotals.values());
    const bestDayUsd = dayPnlValues.length > 0 ? Math.max(...dayPnlValues) : 0;
    const worstDayUsd = dayPnlValues.length > 0 ? Math.min(...dayPnlValues) : 0;

    const lastTradeIso = tradeRows.length > 0 ? tradeRows[tradeRows.length - 1]?.created_at ?? null : null;
    const runtimeLastRunIso = runtimeState?.last_run_at ? String(runtimeState.last_run_at) : null;
    const lastRunIso = runtimeLastRunIso ?? lastTradeIso ?? (runtime?.updated_at ? String(runtime.updated_at) : null);

    const timestamps = tradeRows
      .map((trade) => (trade.created_at ? new Date(trade.created_at).getTime() : NaN))
      .filter((value) => Number.isFinite(value));

    const runFrequencySeconds =
      timestamps.length >= 2
        ? Math.round(
            average(
              timestamps.slice(1).map((time, index) => Math.max(0, (time - timestamps[index]) / 1000))
            )
          )
        : null;

    const payload: MarketSummaryViewModel = {
      mode,
      startingBalanceUsd: round2(startingBalanceUsd),
      currentBalanceUsd: round2(currentBalanceUsd),
      availableCashUsd: round2(availableCashUsd),
      totalProfitLossUsd: round2(totalProfitLossUsd),
      todayProfitLossUsd: round2(todayProfitLossUsd),
      openPositions: openTrades.length,
      totalTrades: tradeRows.length,
      winRatePct: round2(winRatePct),
      averageTradeUsd: round2(averageTradeUsd),
      averageProfitUsd: round2(averageProfitUsd),
      bestDayUsd: round2(bestDayUsd),
      worstDayUsd: round2(worstDayUsd),
      lastRunIso,
      runFrequencySeconds,
    };

    return noStoreJson({
      ok: true,
      data: payload,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "summary_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to build market summary",
        },
      },
      { status: 500 }
    );
  }
}
