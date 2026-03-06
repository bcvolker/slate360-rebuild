/**
 * POST /api/market/settle-trades
 *
 * Checks all "open" trades for the calling user against the Polymarket
 * Gamma API to determine if their markets have resolved, then updates
 * pnl + status in market_trades accordingly.
 *
 * Also updates unrealized P&L for still-open trades using current prices.
 *
 * Should be called:
 *  - On "Wallet & Performance" tab mount
 *  - After a buy completes
 *  - Periodically by the client (every 5 min while tab is active)
 *
 * Returns: { settled: number, updated: number, errors: string[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TradeRow {
  id: string;
  market_id: string;
  side: string;
  shares: number | string;
  price: number | string;
  total: number | string;
  status: string;
  take_profit_pct?: number | string | null;
  stop_loss_pct?: number | string | null;
}

interface GammaMarket {
  id?: string;
  resolved_outcome?: string | null;
  outcome_prices?: string | number[] | null;
  outcomePrices?: string | number[] | null;
  probability?: string | number | null;
  active?: boolean;
  closed?: boolean;
}

function parseCurrentPrice(market: GammaMarket, side: string): number | null {
  const rawPrices = market.outcomePrices ?? market.outcome_prices;
  let yesPrice: number | null = null;
  let noPrice: number | null = null;

  if (Array.isArray(rawPrices)) {
    yesPrice = Number(rawPrices[0]);
    noPrice = Number(rawPrices[1]);
  } else if (typeof rawPrices === "string") {
    try {
      const parsed = JSON.parse(rawPrices) as number[];
      yesPrice = Number(parsed[0]);
      noPrice = Number(parsed[1]);
    } catch {
      // ignore
    }
  }

  if (!yesPrice && market.probability != null) {
    const p = Number(market.probability);
    yesPrice = p > 1 ? p / 100 : p;
    noPrice = 1 - yesPrice;
  }

  const price = side.toUpperCase() === "NO" ? noPrice : yesPrice;
  return price != null && Number.isFinite(price) ? Math.min(Math.max(price, 0.01), 0.99) : null;
}

async function fetchGammaMarket(marketId: string): Promise<GammaMarket | null> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets/${encodeURIComponent(marketId)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "Slate360/1.0" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as GammaMarket;
  } catch {
    return null;
  }
}

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {

    // Fetch all open trades (user_id is always explicitly scoped below — no RLS needed)
    const { data: trades, error: tradesError } = await admin
      .from("market_trades")
      .select("id,market_id,side,shares,price,total,status,take_profit_pct,stop_loss_pct")
      .eq("user_id", user.id)
      .eq("status", "open");

    if (tradesError) return NextResponse.json({ error: tradesError.message }, { status: 500 });
    if (!trades || trades.length === 0) return NextResponse.json({ settled: 0, updated: 0, errors: [] });

    // Deduplicate market IDs to avoid hammering gamma API
    const uniqueMarketIds = [...new Set((trades as TradeRow[]).map((t) => t.market_id).filter(Boolean))];

    // Fetch all markets concurrently (max 10 at a time to avoid rate limits)
    const marketCache = new Map<string, GammaMarket | null>();
    for (let i = 0; i < uniqueMarketIds.length; i += 10) {
      const batch = uniqueMarketIds.slice(i, i + 10);
      const results = await Promise.all(batch.map((id) => fetchGammaMarket(id)));
      batch.forEach((id, idx) => marketCache.set(id, results[idx]));
    }

    let settled = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process each trade
    await Promise.all((trades as TradeRow[]).map(async (trade) => {
      try {
        const market = marketCache.get(trade.market_id);
        if (!market) return;

        const shares = Number(trade.shares);
        const price = Number(trade.price);
        const total = Number(trade.total);
        const side = String(trade.side ?? "YES").toUpperCase();

        const resolvedOutcome = market.resolved_outcome?.toUpperCase() ?? null;

        if (resolvedOutcome === "YES" || resolvedOutcome === "NO") {
          // Market has resolved — calculate final PnL
          const won = side === resolvedOutcome;
          // If won: receive $1 per share → pnl = shares * 1 - total
          // If lost: receive $0 per share → pnl = -total
          const pnl = won ? Math.round((shares - total) * 100) / 100 : -Math.round(total * 100) / 100;

          const { error: updateError } = await admin
            .from("market_trades")
            .update({
              pnl,
              status: "closed",
              closed_at: new Date().toISOString(),
            })
            .eq("id", trade.id)
            .eq("user_id", user.id);

          if (updateError) errors.push(`settle ${trade.id}: ${updateError.message}`);
          else settled++;
        } else {
          // Market still open — update unrealized PnL from current price
          const currentPrice = parseCurrentPrice(market, side);
          if (currentPrice != null && Number.isFinite(price) && price > 0) {
            const unrealizedPnl = Math.round((shares * currentPrice - total) * 100) / 100;
            const pnlPct = total > 0 ? (unrealizedPnl / total) * 100 : 0;
            const takeProfitPct = Number(trade.take_profit_pct ?? 0);
            const stopLossPct = Number(trade.stop_loss_pct ?? 0);

            // Exit logic for paper/autopilot positions
            if (Number.isFinite(takeProfitPct) && takeProfitPct > 0 && pnlPct >= takeProfitPct) {
              const { error: closeErr } = await admin
                .from("market_trades")
                .update({
                  pnl: unrealizedPnl,
                  status: "closed",
                  closed_at: new Date().toISOString(),
                  reason: `Auto take-profit hit (${takeProfitPct}%)`,
                })
                .eq("id", trade.id)
                .eq("user_id", user.id);
              if (closeErr) errors.push(`tp-close ${trade.id}: ${closeErr.message}`);
              else settled++;
              return;
            }

            if (Number.isFinite(stopLossPct) && stopLossPct > 0 && pnlPct <= -Math.abs(stopLossPct)) {
              const { error: closeErr } = await admin
                .from("market_trades")
                .update({
                  pnl: unrealizedPnl,
                  status: "closed",
                  closed_at: new Date().toISOString(),
                  reason: `Auto stop-loss hit (${stopLossPct}%)`,
                })
                .eq("id", trade.id)
                .eq("user_id", user.id);
              if (closeErr) errors.push(`sl-close ${trade.id}: ${closeErr.message}`);
              else settled++;
              return;
            }

            const { error: updateError } = await admin
              .from("market_trades")
              .update({ pnl: unrealizedPnl })
              .eq("id", trade.id)
              .eq("user_id", user.id);

            if (updateError) errors.push(`update ${trade.id}: ${updateError.message}`);
            else updated++;
          }
        }
      } catch (e) {
        errors.push(`trade ${trade.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }));

    return NextResponse.json({
      settled,
      updated,
      total: trades.length,
      errors,
    });
  });

export async function GET() {
  return NextResponse.json({
    info: "POST to settle open trades. Checks Polymarket resolution and updates PnL.",
    usage: "Call after buying, on tab mount, or periodically.",
  });
}
