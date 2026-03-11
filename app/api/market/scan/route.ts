import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import type { ApiEnvelope, ScanAppliedConfig, ScanRequest, ScanResponse } from "@/lib/market/contracts";
import { mapTradeRowToTradeVM } from "@/lib/market/mappers";
import { getScanMaxMarketLimit, parseScanRequest } from "@/lib/market/scan-request";
import { fetchMarkets, scoreOpportunities, decideTrades, simulatePaperTrade, type BotConfig, DEFAULT_CONFIG } from "@/lib/market-bot";
import { buildRuntimeConfigFromDirective, buildRuntimeConfigFromPlan, filterExecutableOpportunities, normalizeFocusAreas, type MarketDirectiveRuntimeRow, type MarketPlanRuntimeRow } from "@/lib/market/runtime-config";
import { calculatePositionSize, checkSafetyConstraints } from "@/lib/market/execution-policy";
import { insertMarketTradesWithFallback } from "@/lib/market/trade-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T> & Record<string, unknown>, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status, headers: { "Cache-Control": "no-store" } });
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function isMissingPlansSchema(code: string | undefined, message: string | undefined) {
  return code === "42P01" || code === "PGRST205" || message?.includes("market_plans") === true;
}

export async function POST(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    if (!access.canAccessMarket) return noStoreJson({ ok: false, error: { code: "forbidden", message: "Market access required" } }, { status: 403 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { request: requestConfig, appliedConfig, providedKeys, errors } = parseScanRequest(body);
    if (errors.length > 0) {
      return noStoreJson({ ok: false, error: { code: "invalid_scan_request", message: "Invalid scan request payload", details: { errors } }, meta: { timestamp: new Date().toISOString(), ignoredKeys: [], appliedConfig } }, { status: 400 });
    }

    const savedConfig = user.user_metadata?.marketBotConfig as Record<string, unknown> | undefined;
    const [{ data: plan, error: planError }, { data: directive }, { data: botSettings }] = await Promise.all([
      supabase
        .from("market_plans")
        .select("mode,budget,risk_level,categories,scan_mode,max_trades_per_day,max_daily_loss,max_open_positions,max_pct_per_trade,fee_alert_threshold,cooldown_after_loss_streak,large_trader_signals,closing_soon_focus,slippage,minimum_liquidity,maximum_spread,fill_policy,exit_rules,runtime_config,is_default,updated_at")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("market_directives")
        .select("amount,buys_per_day,risk_mix,focus_areas,paper_mode,timeframe")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("market_bot_runtime").select("status").eq("user_id", user.id).single(),
    ]);
    if (planError && !isMissingPlansSchema(planError.code, planError.message)) {
      throw new Error(`market_plans_read_failed:${planError.message}`);
    }
    const botStatus = botSettings?.status ?? "stopped";
    const runtimeConfig = plan
      ? buildRuntimeConfigFromPlan(plan as MarketPlanRuntimeRow, savedConfig)
      : buildRuntimeConfigFromDirective(directive as MarketDirectiveRuntimeRow | null, botStatus, savedConfig);
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
        ? normalizeFocusAreas(requestConfig.focusAreas)
        : runtimeConfig.focusAreas,
    };

    const ignoredKeys = providedKeys.filter((key) => key === "whale_follow");

    const executeTrades = requestConfig.executeTrades !== false;
    const oneOffPaperScan = config.paperMode === true;

    // Allow paper scans to bypass bot-status gate. For non-paper scans,
    // also accept a recent bot-status override — the client just set the
    // status but the DB may not have propagated yet, so re-query once.
    let effectiveBotStatus = botStatus;
    if (executeTrades && !oneOffPaperScan && (botStatus === "stopped" || botStatus === "paused")) {
      // Re-query once to handle race condition with ensureBotRunning
      const { data: freshStatus } = await supabase
        .from("market_bot_runtime")
        .select("status")
        .eq("user_id", user.id)
        .single();
      effectiveBotStatus = freshStatus?.status ?? botStatus;
      if (effectiveBotStatus === "stopped" || effectiveBotStatus === "paused") {
        return noStoreJson({ ok: false, error: { code: effectiveBotStatus === "paused" ? "bot_paused" : "bot_stopped", message: effectiveBotStatus === "paused" ? "Bot is paused — start the robot first" : "Bot is stopped — start the robot first" } }, { status: 400 });
      }
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
    const opportunities = filterExecutableOpportunities(scored, {
      minEdgePct: requestConfig.minEdge,
      minVolumeUsd: Math.max(requestConfig.minVolume, runtimeConfig.minimumLiquidity),
      minProbabilityPct: requestConfig.minProbability,
      maxProbabilityPct: requestConfig.maxProbability,
      timeframeHours: runtimeConfig.timeframeHours,
      maxSpreadPct: runtimeConfig.maximumSpreadPct,
    });

    // Unified safety constraints (shared with buy route)
    const safetyCheck = await checkSafetyConstraints({
      userId: user.id,
      supabase,
      maxOpenPositions: runtimeConfig.maxOpenPositions,
    });

    const dailyPnl = safetyCheck.dailyPnl;
    const maxExecutablePositions = Math.min(requestConfig.maxPositions, safetyCheck.remainingOpenSlots || requestConfig.maxPositions);

    const baseDecisions = decideTrades(opportunities, config, dailyPnl);
    const tradeDecisions = baseDecisions
      .map((decision) => {
        const price = decision.side === "YES" ? decision.opp.yesPrice : decision.opp.noPrice;
        // Unified position sizing (shared with buy route)
        const { shares } = calculatePositionSize({
          amount: requestConfig.capitalPerTrade,
          avgPrice: price,
          maxPctPerTrade: runtimeConfig.maxPctPerTrade,
          capitalAlloc: runtimeConfig.capitalAlloc,
        });
        return {
          ...decision,
          shares: Math.max(1, Math.min(decision.shares, shares)),
          reason: `${decision.reason}; capped by capitalPerTrade $${requestConfig.capitalPerTrade.toFixed(2)}`,
        };
      })
      .slice(0, maxExecutablePositions);

    const executedTrades: ReturnType<typeof simulatePaperTrade>[] = [];

    if (executeTrades && (config.paperMode || effectiveBotStatus === "paper")) {
      const simulatedTrades = tradeDecisions.map((decision) => {
        const trade = simulatePaperTrade(user.id, decision.opp, decision.side, decision.shares);
        return { trade, reason: decision.reason };
      });

      if (simulatedTrades.length > 0) {
        const { error: insertErr } = await insertMarketTradesWithFallback(
          supabase,
          simulatedTrades.map(({ trade, reason }) => ({
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
            take_profit_pct: runtimeConfig.takeProfitPct,
            stop_loss_pct: runtimeConfig.stopLossPct,
            entry_mode: runtimeConfig.moonshotMode ? "moonshot" : "scan",
            reason,
          })),
        );

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
    return noStoreJson({ ok: false, error: { code: "scan_unhandled_error", message: err instanceof Error ? err.message : "Scan failed" } }, { status: 500 });
  }
}
