import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CONFIG, decideTrades, scoreOpportunities, simulatePaperTrade, type BotConfig } from "@/lib/market-bot";
import { toNumberOrZero } from "@/lib/market/contracts";
import { logSchedulerNoDecisions, logSchedulerRunSummary, logSchedulerSkip } from "@/lib/market/scheduler-activity-log";
import { evaluateSchedulerGuards } from "@/lib/market/scheduler-guards";
import { clamp, fetchMarketsCached, getConfig, isoDay, normalizeFocusAreas, riskLevelFromMix, type MarketsPromiseCache, type SchedulerConfig } from "@/lib/market/scheduler-utils";

type RuntimeRow = { user_id: string; status: "running" | "paused" | "stopped" | "paper" };

type DirectiveRow = {
  amount: number | string | null;
  buys_per_day: number | null;
  risk_mix: "conservative" | "balanced" | "aggressive" | null;
  focus_areas: string[] | null;
  paper_mode: boolean | null;
  daily_loss_cap: number | string | null;
  moonshot_mode: boolean | null;
  total_loss_cap: number | string | null;
  auto_pause_losing_days: number | null;
  target_profit_monthly: number | string | null;
  take_profit_pct: number | string | null;
  stop_loss_pct: number | string | null;
};

type RuntimeStateRow = {
  day_bucket: string;
  runs_today: number;
  trades_today: number;
  last_run_at: string | null;
};

export type SchedulerUserResult = {
  userId: string;
  status: "executed" | "skipped" | "error";
  reason: string;
  tradesExecuted: number;
  decisions: number;
};

export type SchedulerTickResult = {
  usersConsidered: number;
  usersExecuted: number;
  totalTradesExecuted: number;
  results: SchedulerUserResult[];
  timestamp: string;
};

async function runForUser(
  userId: string,
  runtimeStatus: RuntimeRow["status"],
  now: Date,
  config: SchedulerConfig,
  marketsCache: MarketsPromiseCache,
): Promise<SchedulerUserResult> {
  const admin = createAdminClient();

  const [{ data: directive }, { data: runtimeState }, { data: todayTrades }] = await Promise.all([
    admin
      .from("market_directives")
      .select("amount,buys_per_day,risk_mix,focus_areas,paper_mode,daily_loss_cap,moonshot_mode,total_loss_cap,auto_pause_losing_days,target_profit_monthly,take_profit_pct,stop_loss_pct")
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
      .select("pnl,created_at")
      .eq("user_id", userId)
      .gte("created_at", `${isoDay(now)}T00:00:00Z`),
  ]);

  const directiveRow = (directive ?? null) as DirectiveRow | null;
  const stateRow = (runtimeState ?? null) as RuntimeStateRow | null;

  const buysPerDay = clamp(
    directiveRow?.buys_per_day && Number.isFinite(directiveRow.buys_per_day)
      ? directiveRow.buys_per_day
      : config.defaultBuysPerDay,
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

  const directiveAmount = Math.max(0, toNumberOrZero(directiveRow?.amount));
  const dailyLossCap = Math.max(1, toNumberOrZero(directiveRow?.daily_loss_cap) || 40);
  const totalLossCap = Math.max(1, toNumberOrZero(directiveRow?.total_loss_cap) || 200);
  const moonshotMode = directiveRow?.moonshot_mode === true;
  const targetProfitMonthly = Math.max(0, toNumberOrZero(directiveRow?.target_profit_monthly));
  const capitalBase = directiveAmount > 0 ? directiveAmount : config.defaultCapitalUsd;
  const capitalPerTrade = clamp(capitalBase / Math.max(1, buysPerDay), 1, config.maxPositionUsdCap);

  const botConfig: BotConfig = {
    ...DEFAULT_CONFIG,
    riskLevel: riskLevelFromMix(directiveRow?.risk_mix ?? null),
    paperMode: directiveRow?.paper_mode ?? runtimeStatus !== "running",
    focusAreas: normalizeFocusAreas(directiveRow?.focus_areas),
    maxTradesPerScan: maxPositions,
    maxPositionUsd: capitalPerTrade,
    minOpportunityEdgePct: 1,
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
  const scored = scoreOpportunities(markets, botConfig);

  const dailyPnl = (todayTrades ?? []).reduce((sum, trade) => sum + toNumberOrZero((trade as { pnl?: unknown }).pnl), 0);
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
    directive: directiveRow,
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
  const decisions = decideTrades(scored, botConfig, dailyPnl).slice(0, maxPositions);

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
      take_profit_pct: toNumberOrZero(directiveRow?.take_profit_pct) || 20,
      stop_loss_pct: toNumberOrZero(directiveRow?.stop_loss_pct) || 10,
      entry_mode: moonshotMode ? "moonshot" : "scheduler",
      reason,
    }));

    const { error: insertError } = await admin.from("market_trades").insert(rows);
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

  return {
    userId,
    status: "executed",
    reason: executed > 0 ? "ok" : "no_decisions_or_live_mode",
    tradesExecuted: executed,
    decisions: decisions.length,
  };
}

export async function runMarketSchedulerTick(now = new Date()): Promise<SchedulerTickResult> {
  const admin = createAdminClient();
  const config = getConfig();

  const { data: runtimeRows, error } = await admin
    .from("market_bot_runtime")
    .select("user_id,status")
    .in("status", ["running", "paper"])
    .limit(config.maxUsersPerTick);

  if (error) {
    throw new Error(`Failed to fetch runtime rows: ${error.message}`);
  }

  const rows = (runtimeRows ?? []) as RuntimeRow[];
  const results: SchedulerUserResult[] = [];
  const marketsCache: MarketsPromiseCache = new Map();

  for (let offset = 0; offset < rows.length; offset += config.concurrency) {
    const chunk = rows.slice(offset, offset + config.concurrency);

    const chunkResults = await Promise.all(
      chunk.map(async (row): Promise<SchedulerUserResult> => {
        try {
          return await runForUser(row.user_id, row.status, now, config, marketsCache);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown_error";

          await admin.from("market_bot_runtime_state").upsert(
            {
              user_id: row.user_id,
              day_bucket: isoDay(now),
              updated_at: now.toISOString(),
              last_error: message.slice(0, 500),
              last_error_at: now.toISOString(),
            },
            { onConflict: "user_id" },
          );

          return {
            userId: row.user_id,
            status: "error",
            reason: message,
            tradesExecuted: 0,
            decisions: 0,
          };
        }
      }),
    );

    results.push(...chunkResults);
  }

  return {
    usersConsidered: rows.length,
    usersExecuted: results.filter((result) => result.status === "executed").length,
    totalTradesExecuted: results.reduce((sum, result) => sum + result.tradesExecuted, 0),
    results,
    timestamp: now.toISOString(),
  };
}
