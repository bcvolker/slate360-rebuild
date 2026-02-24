import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CONFIG,
  decideTrades,
  fetchMarkets,
  scoreOpportunities,
  simulatePaperTrade,
  type BotConfig,
  type FocusArea,
  type RiskLevel,
} from "@/lib/market-bot";
import { toNumberOrZero } from "@/lib/market/contracts";

type RuntimeRow = {
  user_id: string;
  status: "running" | "paused" | "stopped" | "paper";
};

type DirectiveRow = {
  amount: number | string | null;
  buys_per_day: number | null;
  risk_mix: "conservative" | "balanced" | "aggressive" | null;
  focus_areas: string[] | null;
  paper_mode: boolean | null;
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

type SchedulerConfig = {
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  maxUsersPerTick: number;
  concurrency: number;
  maxTradesPerScan: number;
  maxMarketLimit: number;
  defaultBuysPerDay: number;
  defaultCapitalUsd: number;
  maxPositionUsdCap: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getConfig(): SchedulerConfig {
  const minIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MIN_INTERVAL_SECONDS ?? 30);
  const maxIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MAX_INTERVAL_SECONDS ?? 3600);
  const maxUsersPerTick = Number(process.env.MARKET_SCHEDULER_MAX_USERS_PER_TICK ?? 100);
  const concurrency = Number(process.env.MARKET_SCHEDULER_CONCURRENCY ?? 12);
  const maxTradesPerScan = Number(process.env.MARKET_SCHEDULER_MAX_TRADES_PER_SCAN ?? 250);
  const maxMarketLimit = Number(process.env.MARKET_SCHEDULER_MAX_MARKET_LIMIT ?? 5000);
  const defaultBuysPerDay = Number(process.env.MARKET_SCHEDULER_DEFAULT_BUYS_PER_DAY ?? 24);
  const defaultCapitalUsd = Number(process.env.MARKET_SCHEDULER_DEFAULT_CAPITAL_USD ?? 1000);
  const maxPositionUsdCap = Number(process.env.MARKET_SCHEDULER_MAX_POSITION_USD ?? 100000);

  return {
    minIntervalSeconds: clamp(Number.isFinite(minIntervalSeconds) ? minIntervalSeconds : 30, 5, 86400),
    maxIntervalSeconds: clamp(Number.isFinite(maxIntervalSeconds) ? maxIntervalSeconds : 3600, 30, 86400),
    maxUsersPerTick: clamp(Number.isFinite(maxUsersPerTick) ? Math.floor(maxUsersPerTick) : 100, 1, 1000),
    concurrency: clamp(Number.isFinite(concurrency) ? Math.floor(concurrency) : 12, 1, 100),
    maxTradesPerScan: clamp(Number.isFinite(maxTradesPerScan) ? Math.floor(maxTradesPerScan) : 250, 1, 5000),
    maxMarketLimit: clamp(Number.isFinite(maxMarketLimit) ? Math.floor(maxMarketLimit) : 5000, 50, 10000),
    defaultBuysPerDay: clamp(Number.isFinite(defaultBuysPerDay) ? Math.floor(defaultBuysPerDay) : 24, 1, 100000),
    defaultCapitalUsd: Number.isFinite(defaultCapitalUsd) ? Math.max(defaultCapitalUsd, 1) : 1000,
    maxPositionUsdCap: Number.isFinite(maxPositionUsdCap) ? Math.max(maxPositionUsdCap, 1) : 100000,
  };
}

type MarketsPromiseCache = Map<string, Promise<Awaited<ReturnType<typeof fetchMarkets>>>>;

function getMarketCacheKey(focusAreas: FocusArea[], limit: number): string {
  return `${focusAreas.join(",")}|${limit}`;
}

async function fetchMarketsCached(
  focusAreas: FocusArea[],
  limit: number,
  cache: MarketsPromiseCache,
): Promise<Awaited<ReturnType<typeof fetchMarkets>>> {
  const key = getMarketCacheKey(focusAreas, limit);
  const cachedPromise = cache.get(key);
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = fetchMarkets(focusAreas, limit);
  cache.set(key, promise);
  return promise;
}

function normalizeFocusAreas(values: string[] | null | undefined): FocusArea[] {
  const allowed: FocusArea[] = ["all", "crypto", "politics", "sports", "weather", "economy"];
  const normalized = (values ?? [])
    .map((value) => {
      const lower = String(value).toLowerCase();
      if (lower.includes("construction") || lower.includes("real estate")) return "economy";
      return lower;
    })
    .filter((value): value is FocusArea => allowed.includes(value as FocusArea));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["all"];
}

function riskLevelFromMix(mix: DirectiveRow["risk_mix"]): RiskLevel {
  if (mix === "conservative") return "low";
  if (mix === "aggressive") return "high";
  return "medium";
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
      .select("amount,buys_per_day,risk_mix,focus_areas,paper_mode")
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

  const marketLimit = clamp(Math.max(maxPositions * 8, 120), 50, config.maxMarketLimit);
  const markets = await fetchMarketsCached(botConfig.focusAreas, marketLimit, marketsCache);
  const scored = scoreOpportunities(markets, botConfig);

  const dailyPnl = (todayTrades ?? []).reduce((sum, trade) => sum + toNumberOrZero((trade as { pnl?: unknown }).pnl), 0);
  const decisions = decideTrades(scored, botConfig, dailyPnl).slice(0, maxPositions);

  let executed = 0;

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
      reason,
    }));

    const { error: insertError } = await admin.from("market_trades").insert(rows);
    if (insertError) {
      throw new Error(`insert_failed:${insertError.message}`);
    }
    executed = rows.length;
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
