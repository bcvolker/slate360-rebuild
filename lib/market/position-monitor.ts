/**
 * Position monitor — checks open trades against current prices
 * and auto-closes positions that hit their take-profit or stop-loss targets.
 *
 * Called once per scheduler tick, after new trades are placed.
 * Only operates on paper trades for now (live close requires CLOB sell order).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { updateMarketTradeWithFallback } from "@/lib/market/trade-persistence";

const POLY_API = "https://gamma-api.polymarket.com";

interface OpenTradeRow {
  id: string;
  market_id: string;
  side: "YES" | "NO";
  price: number;
  shares: number;
  total: number;
  take_profit_pct: number | null;
  stop_loss_pct: number | null;
  paper_trade: boolean;
}

interface PriceMap {
  [marketId: string]: { yesPrice: number; noPrice: number };
}

interface MonitorResult {
  checked: number;
  closed: number;
  closedTrades: { id: string; reason: string; pnl: number }[];
  errors: string[];
}

/** Fetch current YES/NO prices for a set of market IDs. */
async function fetchCurrentPrices(marketIds: string[]): Promise<PriceMap> {
  const prices: PriceMap = {};
  // Batch in groups of 20 to avoid URL length limits
  const batchSize = 20;
  for (let i = 0; i < marketIds.length; i += batchSize) {
    const batch = marketIds.slice(i, i + batchSize);
    try {
      const params = new URLSearchParams({ id: batch.join(","), closed: "false" });
      const res = await fetch(`${POLY_API}/markets?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const markets = (await res.json()) as Array<{
        id: string;
        outcomePrices: string;
      }>;
      for (const mkt of markets) {
        try {
          const p = JSON.parse(mkt.outcomePrices || "[]") as string[];
          if (p.length >= 2) {
            prices[mkt.id] = {
              yesPrice: parseFloat(p[0]),
              noPrice: parseFloat(p[1]),
            };
          }
        } catch { /* skip malformed */ }
      }
    } catch { /* network error, skip batch */ }
  }
  return prices;
}

/**
 * Scan open positions for a user and close any that hit TP or SL.
 *
 * - Take profit: current price >= entry price * (1 + takeProfitPct/100)
 * - Stop loss:   current price <= entry price * (1 - stopLossPct/100)
 *
 * For paper trades, closing means marking status="closed" + calculating PnL.
 */
export async function monitorPositions(
  admin: SupabaseClient,
  userId: string,
): Promise<MonitorResult> {
  const result: MonitorResult = { checked: 0, closed: 0, closedTrades: [], errors: [] };

  // Get open trades for this user
  const { data: openTrades, error } = await admin
    .from("market_trades")
    .select("id,market_id,side,price,shares,total,take_profit_pct,stop_loss_pct,paper_trade")
    .eq("user_id", userId)
    .eq("status", "open");

  if (error || !openTrades || openTrades.length === 0) return result;

  const trades = openTrades as OpenTradeRow[];
  result.checked = trades.length;

  // Only check trades that actually have TP or SL configured
  const monitored = trades.filter((t) => t.take_profit_pct != null || t.stop_loss_pct != null);
  if (monitored.length === 0) return result;

  // Fetch current prices for all unique markets
  const marketIds = [...new Set(monitored.map((t) => t.market_id))];
  const prices = await fetchCurrentPrices(marketIds);

  for (const trade of monitored) {
    const mktPrices = prices[trade.market_id];
    if (!mktPrices) continue;

    const currentPrice = trade.side === "YES" ? mktPrices.yesPrice : mktPrices.noPrice;
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;

    const entryPrice = trade.price;
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) continue;

    const pricePctChange = ((currentPrice - entryPrice) / entryPrice) * 100;
    let closeReason: string | null = null;

    // Check take-profit
    if (trade.take_profit_pct != null && pricePctChange >= trade.take_profit_pct) {
      closeReason = `Take profit hit: price up ${pricePctChange.toFixed(1)}% (target: ${trade.take_profit_pct}%)`;
    }

    // Check stop-loss
    if (trade.stop_loss_pct != null && pricePctChange <= -trade.stop_loss_pct) {
      closeReason = `Stop loss hit: price down ${Math.abs(pricePctChange).toFixed(1)}% (limit: ${trade.stop_loss_pct}%)`;
    }

    if (!closeReason) continue;

    // Close the position
    const pnl = Math.round((currentPrice - entryPrice) * trade.shares * 100) / 100;
    const { error: closeError } = await updateMarketTradeWithFallback(admin, trade.id, {
      status: "closed",
      pnl,
      closed_at: new Date().toISOString(),
      reason: closeReason,
    });

    if (closeError) {
      result.errors.push(`Failed to close trade ${trade.id}: ${closeError.message}`);
    } else {
      result.closed++;
      result.closedTrades.push({ id: trade.id, reason: closeReason, pnl });
    }
  }

  return result;
}
