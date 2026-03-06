import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ApiEnvelope,
  ScanAppliedConfig,
  ScanRequest,
  ScanResponse,
} from "@/lib/market/contracts";
import { toNumberOrZero } from "@/lib/market/contracts";
import { mapTradeRowToTradeVM } from "@/lib/market/mappers";
import { getScanMaxMarketLimit, parseScanRequest } from "@/lib/market/scan-request";
import {
  fetchMarkets,
  scoreOpportunities,
  decideTrades,
  simulatePaperTrade,
  type BotConfig,
  DEFAULT_CONFIG,
} from "@/lib/market-bot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T> & Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}


export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const { request: requestConfig, appliedConfig, providedKeys, errors } = parseScanRequest(body);
    if (errors.length > 0) {
      return noStoreJson(
        {
          ok: false,
          error: {
            code: "invalid_scan_request",
            message: "Invalid scan request payload",
            details: { errors },
          },
          meta: {
            timestamp: new Date().toISOString(),
            ignoredKeys: [],
            appliedConfig,
          },
        },
        { status: 400 }
      );
    }

    const savedConfig = user.user_metadata?.marketBotConfig;
    const config: BotConfig = {
      ...(savedConfig ? { ...DEFAULT_CONFIG, ...savedConfig } : DEFAULT_CONFIG),
      paperMode: requestConfig.paperMode,
      maxTradesPerScan: requestConfig.maxPositions,
      maxPositionUsd: requestConfig.capitalPerTrade,
      minOpportunityEdgePct: requestConfig.minEdge,
      maxCandidates: Math.max(requestConfig.maxPositions * 5, 200),
      riskLevel:
        requestConfig.riskMix === "conservative"
          ? "low"
          : requestConfig.riskMix === "aggressive"
            ? "high"
            : "medium",
      portfolioMix:
        requestConfig.riskMix === "conservative"
          ? { low: 70, medium: 25, high: 5 }
          : requestConfig.riskMix === "aggressive"
            ? { low: 20, medium: 35, high: 45 }
            : { low: 45, medium: 40, high: 15 },
      whaleWatch: requestConfig.whaleFollow,
      focusAreas: requestConfig.focusAreas.length > 0
        ? requestConfig.focusAreas
        : (savedConfig?.focusAreas ?? DEFAULT_CONFIG.focusAreas),
    };

    const ignoredKeys = providedKeys.filter((key) => key === "whale_follow");

    const { data: botSettings } = await supabase
      .from("market_bot_runtime")
      .select("status")
      .eq("user_id", user.id)
      .single();

    const botStatus = botSettings?.status ?? "stopped";

    const executeTrades = requestConfig.executeTrades !== false;
    const oneOffPaperScan = config.paperMode === true;
    if (executeTrades && botStatus === "stopped" && !oneOffPaperScan) {
      return noStoreJson(
        { ok: false, error: { code: "bot_stopped", message: "Bot is stopped" } },
        { status: 400 }
      );
    }
    if (executeTrades && botStatus === "paused" && !oneOffPaperScan) {
      return noStoreJson(
        { ok: false, error: { code: "bot_paused", message: "Bot is paused" } },
        { status: 400 }
      );
    }

    const requestedMarketLimit = Number((body as Record<string, unknown>)?.market_limit ?? 0);
    const marketLimit = clamp(
      Number.isFinite(requestedMarketLimit) && requestedMarketLimit > 0
        ? requestedMarketLimit
        : Math.max(requestConfig.maxPositions * 8, 120),
      50,
      getScanMaxMarketLimit()
    );
    const markets = await fetchMarkets(config.focusAreas ?? ["all"], marketLimit);

    const scored = scoreOpportunities(markets, config);
    const opportunities = scored.filter((opp) => {
      const probabilityPct = opp.yesPrice * 100;
      if (opp.edge < requestConfig.minEdge) return false;
      if (opp.volume24h < requestConfig.minVolume) return false;
      if (probabilityPct < requestConfig.minProbability || probabilityPct > requestConfig.maxProbability) return false;
      return true;
    });

    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnl = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.pnl), 0) ?? 0;

    const baseDecisions = decideTrades(opportunities, config, dailyPnl);
    const tradeDecisions = baseDecisions
      .map((decision) => {
        const price = decision.side === "YES" ? decision.opp.yesPrice : decision.opp.noPrice;
        const maxSharesByCapital = Math.floor(requestConfig.capitalPerTrade / Math.max(price, 0.01));
        const shares = Math.max(1, Math.min(decision.shares, maxSharesByCapital));
        return {
          ...decision,
          shares,
          reason: `${decision.reason}; capped by capitalPerTrade $${requestConfig.capitalPerTrade.toFixed(2)}`,
        };
      })
      .slice(0, requestConfig.maxPositions);

    const executedTrades: ReturnType<typeof simulatePaperTrade>[] = [];
    const { data: latestDirective } = await supabase
      .from("market_directives")
      .select("take_profit_pct,stop_loss_pct,moonshot_mode")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (executeTrades && (config.paperMode || botStatus === "paper")) {
      const simulatedTrades = tradeDecisions.map((decision) => {
        const trade = simulatePaperTrade(
          user.id,
          decision.opp,
          decision.side,
          decision.shares,
        );
        return { trade, reason: decision.reason };
      });

      if (simulatedTrades.length > 0) {
        const rows = simulatedTrades.map(({ trade, reason }) => ({
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
            take_profit_pct: latestDirective?.take_profit_pct ?? 20,
            stop_loss_pct: latestDirective?.stop_loss_pct ?? 10,
            entry_mode: latestDirective?.moonshot_mode ? "moonshot" : "scan",
            reason,
          }));

        const { error: insertErr } = await supabase
          .from("market_trades")
          .insert(rows);

        if (!insertErr) {
          executedTrades.push(...simulatedTrades.map((item) => item.trade));
        }
      }
    }

    const mappedTrades = executedTrades.map((trade) =>
      mapTradeRowToTradeVM({
        id: trade.id,
        market_id: trade.marketId,
        question: trade.question,
        side: trade.side,
        shares: trade.shares,
        price: trade.price,
        total: trade.total,
        status: trade.status,
        pnl: trade.pnl,
        paper_trade: true,
        created_at: trade.createdAt,
      })
    );

    const decisions = tradeDecisions.map((d) => ({
      marketId: d.opp.id,
      question: d.opp.question,
      side: d.side,
      shares: d.shares,
      why: d.reason,
      edge: d.opp.edge,
    }));

    const scannedAtIso = new Date().toISOString();
    const payload: ScanResponse = {
      scannedAtIso,
      marketsScanned: markets.length,
      opportunitiesFound: opportunities.length,
      decisions,
      executed: mappedTrades,
      appliedConfig,
    };

    try {
      await supabase.from("market_activity_log").insert({
        user_id: user.id,
        level: "info",
        message: executeTrades
          ? `Found ${opportunities.length} edges, selected ${tradeDecisions.length}, executed ${mappedTrades.length} trades.`
          : `Preview found ${opportunities.length} edges and ${tradeDecisions.length} candidate trades (no execution).`,
        context: {
          executeTrades,
          marketsScanned: markets.length,
          opportunitiesFound: opportunities.length,
          selectedDecisions: tradeDecisions.length,
          executedCount: mappedTrades.length,
        },
      });
    } catch {
      // best effort
    }

    return noStoreJson({
      ok: true,
      data: payload,
      meta: {
        timestamp: scannedAtIso,
        ignoredKeys,
        appliedConfig,
      },
    });
  } catch (err) {
    console.error("[api/market/scan]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "scan_unhandled_error",
          message: err instanceof Error ? err.message : "Scan failed",
        },
      },
      { status: 500 }
    );
  }
}
