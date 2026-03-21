import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, decideTrades, scoreOpportunities, simulatePaperTrade, type BotConfig } from "@/lib/market-bot";
import { toNumberOrZero } from "@/lib/market/contracts";
import { logSchedulerNoDecisions, logSchedulerRunSummary, logSchedulerSkip } from "@/lib/market/scheduler-activity-log";
import { evaluateSchedulerGuards } from "@/lib/market/scheduler-guards";
import { applyDecisionShareCaps, buildSchedulerRuntimeConfig } from "@/lib/market/scheduler-runtime";
import {
  buildRuntimeConfigFromDirective,
  buildRuntimeConfigFromPlan,
  filterExecutableOpportunities,
  type MarketDirectiveRuntimeRow,
  type MarketPlanRuntimeRow,
} from "@/lib/market/runtime-config";
import { insertMarketTradesWithFallback } from "@/lib/market/trade-persistence";
import { monitorPositions } from "@/lib/market/position-monitor";
import { checkFeeThreshold } from "@/lib/market/execution-policy";
import { clamp, fetchMarketsCached, isoDay, riskLevelFromMix, type MarketsPromiseCache, type SchedulerConfig } from "@/lib/market/scheduler-utils";

type RuntimeRowStatus = "running" | "paused" | "stopped" | "paper";

type RuntimeStateRow = {
  day_bucket: string;
  runs_today: number;
  trades_today: number;
  last_run_at: string | null;
};

function isMissingPlansSchema(code: string | undefined, message: string | undefined) {
  return code === "42P01" || code === "PGRST205" || message?.includes("market_plans") === true;
}

export type SchedulerUserResult = {
  userId: string;
  status: "executed" | "skipped" | "error";
  reason: string;
  tradesExecuted: number;
  decisions: number;
};

export async function runForUser(
  userId: string,
  runtimeStatus: RuntimeRowStatus,
  now: Date,
  config: SchedulerConfig,
  marketsCache: MarketsPromiseCache,
): Promise<SchedulerUserResult> {
  const admin = createAdminClient();

  const [{ data: plan, error: planError }, { data: directive }, { data: runtimeState }, { data: todayTrades }] = await Promise.all([
    admin
      .from("market_plans")
      .select("mode,budget,risk_level,categories,scan_mode,max_trades_per_day,max_daily_loss,max_open_positions,max_pct_per_trade,fee_alert_threshold,cooldown_after_loss_streak,large_trader_signals,closing_soon_focus,slippage,minimum_liquidity,maximum_spread,fill_policy,exit_rules,runtime_config,is_default,updated_at")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("market_directives")
      .select("amount,buys_per_day,risk_mix,focus_areas,paper_mode,timeframe")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("market_bot_runtime_state")
      .select("day_bucket,runs_today,trades_today,last_run_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("market_trades")
      .select("pnl,created_at,status")
      .eq("user_id", userId)
      .gte("created_at", `${isoDay(now)}T00:00:00Z`),
  ]);

  if (planError && !isMissingPlansSchema(planError.code, planError.message)) {
    throw new Error(`market_plans_read_failed:${planError.message}`);
  }

  const planRow = (plan ?? null) as MarketPlanRuntimeRow | null;
  const directiveRow = (directive ?? null) as MarketDirectiveRuntimeRow | null;
  const stateRow = (runtimeState ?? null) as RuntimeStateRow | null;
  const { data: authUserData } = await admin.auth.admin.getUserById(userId);
  const savedConfig = authUserData.user?.user_metadata?.marketBotConfig as Record<string, unknown> | undefined;
  const runtimeConfig = planRow
    ? buildRuntimeConfigFromPlan(planRow, savedConfig)
    : buildRuntimeConfigFromDirective(directiveRow, runtimeStatus, savedConfig);
  const schedulerConfig = buildSchedulerRuntimeConfig(directiveRow, runtimeStatus, savedConfig);

  const buysPerDay = clamp(
    runtimeConfig.maxTradesPerDay || config.defaultBuysPerDay,
    1,
    100000,
  );

  const intervalFromBuysPerDay = Math.floor(86400 / Math.max(1, buysPerDay));
  const runFrequencySeconds = clamp(intervalFromBuysPerDay, config.minIntervalSeconds, config.maxIntervalSeconds);

  const lastRunAt = stateRow?.last_run_at ? new Date(stateRow.last_run_at) : null;
  if (lastRunAt && Number.isFinite(lastRunAt.getTime())) {
    const elapsedSeconds = Math.floor((now.getTime() - lastRunAt.getTime()) / 1000);
    if (elapsedSeconds < runFrequencySeconds) {
      return {
        userId,
        status: "skipped",
        reason: `too_soon_${elapsedSeconds}s`,
        tradesExecuted: 0,
        decisions: 0,
      };
    }
  }

  const stateDay = stateRow?.day_bucket ?? isoDay(now);
  const sameDay = stateDay === isoDay(now);
  const tradesTodayFromState = sameDay ? (stateRow?.trades_today ?? 0) : 0;
  const runsTodayFromState = sameDay ? (stateRow?.runs_today ?? 0) : 0;

  const remainingDailyTrades = Math.max(0, buysPerDay - tradesTodayFromState);
  if (remainingDailyTrades <= 0) {
    return {
      userId,
      status: "skipped",
      reason: "daily_budget_reached",
      tradesExecuted: 0,
      decisions: 0,
    };
  }

  const expectedRunsPerDay = Math.max(1, Math.floor(86400 / runFrequencySeconds));
  const targetTradesThisRun = Math.max(1, Math.ceil(buysPerDay / expectedRunsPerDay));
  const maxPositions = Math.min(targetTradesThisRun, remainingDailyTrades, config.maxTradesPerScan);

  const dailyLossCap = runtimeConfig.dailyLossCap;
  const totalLossCap = runtimeConfig.totalLossCap;
  const moonshotMode = runtimeConfig.moonshotMode;
  const targetProfitMonthly = Math.max(0, toNumberOrZero(runtimeConfig.targetProfitMonthly));
  const capitalBase = Math.max(1, runtimeConfig.capitalAlloc || config.defaultCapitalUsd);
  const positionBudgetCount = Math.max(1, runtimeConfig.maxOpenPositions);
  const capitalPerTrade = clamp(capitalBase / positionBudgetCount, 1, config.maxPositionUsdCap);

  const botConfig: BotConfig = {
    ...DEFAULT_CONFIG,
    riskLevel: riskLevelFromMix(planRow?.risk_level ?? directiveRow?.risk_mix ?? null),
    paperMode: runtimeConfig.paperMode,
    focusAreas: runtimeConfig.focusAreas,
    maxTradesPerScan: maxPositions,
    maxPositionUsd: capitalPerTrade,
    minOpportunityEdgePct: 0,
    maxCandidates: Math.max(maxPositions * 6, 200),
  };

  if (moonshotMode) {
    botConfig.riskLevel = "high";
    botConfig.maxTradesPerScan = Math.min(config.maxTradesPerScan, Math.max(25, maxPositions * 2));
    botConfig.maxCandidates = Math.max(botConfig.maxCandidates, 500);
  }

  const throughputCap = Math.max(1, runFrequencySeconds * 5);
  botConfig.maxTradesPerScan = Math.min(botConfig.maxTradesPerScan, throughputCap);

  const marketLimit = clamp(Math.max(maxPositions * 8, 120), 50, config.maxMarketLimit);
  const markets = await fetchMarketsCached(botConfig.focusAreas, marketLimit, marketsCache);
  const scored = filterExecutableOpportunities(scoreOpportunities(markets, botConfig), {
    minEdgePct: botConfig.minOpportunityEdgePct,
    minVolumeUsd: runtimeConfig.minimumLiquidity,
    minProbabilityPct: runtimeConfig.minProbabilityPct,
    maxProbabilityPct: runtimeConfig.maxProbabilityPct,
    timeframeHours: runtimeConfig.timeframeHours,
    maxSpreadPct: runtimeConfig.maximumSpreadPct,
  });

  const dailyPnl = (todayTrades ?? []).reduce((sum, trade) => sum + toNumberOrZero((trade as { pnl?: unknown }).pnl), 0);
  const openPositionsCount = (todayTrades ?? []).filter(
    (trade) => String((trade as { status?: unknown }).status ?? "").toLowerCase() === "open",
  ).length;
  const remainingOpenSlots = Math.max(0, runtimeConfig.maxOpenPositions - openPositionsCount);
  const guardResult = await evaluateSchedulerGuards({
    admin,
    userId,
    now,
    dailyPnl,
    dailyLossCap,
    totalLossCap,
    moonshotMode,
    targetProfitMonthly,
    currentMaxTradesPerScan: botConfig.maxTradesPerScan,
    configMaxTradesPerScan: config.maxTradesPerScan,
      directive: { auto_pause_losing_days: schedulerConfig.autoPauseLosingDays },
  });

  if (guardResult.skipReason) {
    await logSchedulerSkip(admin, userId, guardResult.skipReason, {
      dailyPnl,
      dailyLossCap,
      totalLossCap,
      totalPnl: guardResult.totalPnl,
    });
    return {
      userId,
      status: "skipped",
      reason: guardResult.skipReason,
      tradesExecuted: 0,
      decisions: 0,
    };
  }

  botConfig.maxTradesPerScan = guardResult.maxTradesPerScan;
  const totalPnl = guardResult.totalPnl;
  const maxDecisions = Math.max(0, Math.min(maxPositions, remainingOpenSlots || maxPositions));
  const feeThreshold = runtimeConfig.feeAlertThreshold ?? 2;
  const rawDecisions = applyDecisionShareCaps(
    decideTrades(scored, botConfig, dailyPnl),
    capitalBase,
    runtimeConfig,
    maxDecisions,
  );

  // Filter out trades where the edge doesn't cover fees (except arbitrage)
  const decisions = rawDecisions.filter((d) => {
    const feeBlock = checkFeeThreshold(d.opp.edge, d.opp.isArbitrage, feeThreshold);
    return feeBlock === null;
  });

  let executed = 0;

  if (decisions.length === 0) {
    await logSchedulerNoDecisions(admin, userId, {
      scoredCount: scored.length,
      botRiskLevel: botConfig.riskLevel,
      focusAreas: botConfig.focusAreas,
      maxTradesPerScan: botConfig.maxTradesPerScan,
      maxPositionUsd: botConfig.maxPositionUsd,
      dailyPnl,
      maxDailyLoss: botConfig.maxDailyLoss,
    });
  }

  if (decisions.length > 0 && (botConfig.paperMode || runtimeStatus === "paper")) {
    const simulated = decisions.map((decision) => ({
      trade: simulatePaperTrade(userId, decision.opp, decision.side, decision.shares),
      reason: decision.reason,
    }));

    const rows = simulated.map(({ trade, reason }) => ({
      user_id: userId,
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
      entry_mode: moonshotMode ? "moonshot" : "scheduler",
      reason,
    }));

    const { error: insertError } = await insertMarketTradesWithFallback(admin, rows);
    if (insertError) {
      throw new Error(`insert_failed:${insertError.message}`);
    }
    executed = rows.length;

    await logSchedulerRunSummary(admin, userId, {
      scoredCount: scored.length,
      decisionCount: decisions.length,
      executedCount: executed,
      buysPerDay,
      runFrequencySeconds,
      moonshotMode,
      dailyPnl,
      totalPnl,
    });
  }

  await admin.from("market_bot_runtime_state").upsert(
    {
      user_id: userId,
      day_bucket: isoDay(now),
      runs_today: runsTodayFromState + 1,
      trades_today: tradesTodayFromState + executed,
      last_run_at: now.toISOString(),
      last_scan_at: now.toISOString(),
      updated_at: now.toISOString(),
      ...(executed === 0 ? { last_error: null, last_error_at: null } : {}),
    },
    { onConflict: "user_id" },
  );

  // Check open positions for stop-loss / take-profit triggers
  try {
    await monitorPositions(admin, userId);
  } catch (err) {
    console.error(`[scheduler] position monitor error for ${userId}:`, err);
  }

  return {
    userId,
    status: "executed",
    reason: executed > 0 ? "ok" : "no_decisions_or_live_mode",
    tradesExecuted: executed,
    decisions: decisions.length,
  };
}