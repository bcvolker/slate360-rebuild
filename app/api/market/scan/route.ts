/**
 * POST /api/market/scan
 *
 * Scans Polymarket for opportunities using the bot brain.
 * Respects user's risk / portfolio / focus settings.
 * In paper mode, auto-executes paper trades and saves to Supabase.
 * In live mode, returns trade recommendations for client-side wallet signing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchMarkets,
  scoreOpportunities,
  decideTrades,
  simulatePaperTrade,
  type BotConfig,
  DEFAULT_CONFIG,
} from "@/lib/market-bot";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load config from user_metadata
    const savedConfig = user.user_metadata?.marketBotConfig;
    const config: BotConfig = savedConfig
      ? { ...DEFAULT_CONFIG, ...savedConfig }
      : DEFAULT_CONFIG;

    // Read bot status from market_bot_settings table
    const { data: botSettings } = await supabase
      .from("market_bot_settings")
      .select("status")
      .eq("user_id", user.id)
      .single();

    const botStatus = botSettings?.status ?? "stopped";

    // Must be running or paper
    if (botStatus === "stopped") {
      return NextResponse.json({ error: "Bot is stopped" }, { status: 400 });
    }

    // 1. Fetch markets
    const markets = await fetchMarkets(config.focusAreas ?? ["all"], 50);

    // 2. Score opportunities
    const opportunities = scoreOpportunities(markets, config);

    // 3. Get today's P&L from saved trades
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnl =
      todayTrades?.reduce((sum, t) => sum + (t.pnl ?? 0), 0) ?? 0;

    // 4. Decide trades
    const tradeDecisions = decideTrades(opportunities, config, dailyPnl);

    // 5. Execute paper trades or return recommendations
    const executedTrades = [];

    if (config.paperMode || botStatus === "paper") {
      for (const decision of tradeDecisions) {
        const trade = simulatePaperTrade(
          user.id,
          decision.opp,
          decision.side,
          decision.shares,
        );

        // Save to Supabase
        const { error: insertErr } = await supabase
          .from("market_trades")
          .insert({
            user_id: user.id,
            market_id: trade.marketId,
            question: trade.question,
            side: trade.side,
            shares: trade.shares,
            price: trade.price,
            total: trade.total,
            status: trade.status,
            pnl: trade.pnl,
            paper_trade: true,
            reason: decision.reason,
          });

        if (!insertErr) {
          executedTrades.push(trade);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      scannedAt: new Date().toISOString(),
      marketsScanned: markets.length,
      opportunitiesFound: opportunities.length,
      topOpportunities: opportunities.slice(0, 5),
      decisions: tradeDecisions.map((d) => ({
        marketId: d.opp.id,
        question: d.opp.question,
        side: d.side,
        shares: d.shares,
        reason: d.reason,
        edge: d.opp.edge,
      })),
      executedTrades: executedTrades.length,
      dailyPnl,
    });
  } catch (err) {
    console.error("[api/market/scan]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 },
    );
  }
}
