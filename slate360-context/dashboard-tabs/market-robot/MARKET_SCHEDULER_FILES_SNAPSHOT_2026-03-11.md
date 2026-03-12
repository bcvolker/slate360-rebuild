# Market Scheduler File Snapshot

Captured: 2026-03-11
Source branch: `main`

This file contains the current contents of the requested Market scheduler-related files.

## 1. `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm install",
  "devCommand": "next dev",
  "crons": [
    {
      "path": "/api/market/scheduler/tick",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 2. `app/api/market/scheduler/tick/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { runMarketSchedulerTick } from "@/lib/market/scheduler";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Invalid scheduler secret",
      },
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function hasValidSecret(req: NextRequest): boolean {
  const expected = process.env.MARKET_SCHEDULER_SECRET;
  const cronExpected = process.env.CRON_SECRET;
  if (!expected && !cronExpected) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const headerSecret = req.headers.get("x-market-scheduler-secret") ?? "";

  return bearer === expected || headerSecret === expected || bearer === cronExpected || headerSecret === cronExpected;
}

async function acquireSchedulerLock(nowIso: string, lockSeconds = 270): Promise<{ acquired: boolean; lockId: string }> {
  const admin = createAdminClient();
  const lockId = `tick-${Date.now()}`;
  try {
    await admin.from("market_scheduler_lock").upsert(
      {
        lock_key: "global",
        locked_until: "epoch",
        locked_by: null,
        updated_at: nowIso,
      },
      { onConflict: "lock_key" },
    );

    const lockUntil = new Date(Date.now() + lockSeconds * 1000).toISOString();
    const { data, error } = await admin
      .from("market_scheduler_lock")
      .update({ locked_until: lockUntil, locked_by: lockId, updated_at: nowIso })
      .eq("lock_key", "global")
      .lt("locked_until", nowIso)
      .select("lock_key")
      .maybeSingle();

    if (error) {
      return { acquired: false, lockId };
    }
    return { acquired: Boolean(data), lockId };
  } catch {
    // If the lock table is not migrated yet, allow execution (old behavior).
    return { acquired: true, lockId };
  }
}

async function releaseSchedulerLock(lockId: string) {
  const admin = createAdminClient();
  try {
    await admin
      .from("market_scheduler_lock")
      .update({ locked_until: new Date().toISOString(), locked_by: null, updated_at: new Date().toISOString() })
      .eq("lock_key", "global")
      .eq("locked_by", lockId);
  } catch {
    // best effort
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  const nowIso = new Date().toISOString();
  const lock = await acquireSchedulerLock(nowIso);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          skipped: true,
          reason: "tick_locked",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const summary = await runMarketSchedulerTick(new Date());
    return NextResponse.json(
      {
        ok: true,
        data: summary,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "scheduler_tick_failed",
          message: err instanceof Error ? err.message : "Scheduler tick failed",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await releaseSchedulerLock(lock.lockId);
  }
}

export async function GET(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        status: "ready",
        endpoint: "/api/market/scheduler/tick",
        trigger: "POST with Authorization: Bearer <MARKET_SCHEDULER_SECRET>",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
```

## 3. `lib/market/scheduler-run-user.ts`

```ts
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
  const decisions = applyDecisionShareCaps(
    decideTrades(scored, botConfig, dailyPnl),
    capitalBase,
    runtimeConfig,
    maxDecisions,
  );

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

  return {
    userId,
    status: "executed",
    reason: executed > 0 ? "ok" : "no_decisions_or_live_mode",
    tradesExecuted: executed,
    decisions: decisions.length,
  };
}
```

## 4. `app/api/market/plans/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import type { AutomationPlan } from "@/components/dashboard/market/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostgrestError } from "@supabase/supabase-js";

type PlanRow = {
  id: string;
  name: string;
  mode: "practice" | "real";
  budget: number;
  risk_level: AutomationPlan["riskLevel"];
  categories: string[];
  scan_mode: AutomationPlan["scanMode"];
  max_trades_per_day: number;
  max_daily_loss: number;
  max_open_positions: number;
  max_pct_per_trade: number;
  fee_alert_threshold: number;
  cooldown_after_loss_streak: number;
  large_trader_signals: boolean;
  closing_soon_focus: boolean;
  slippage: number;
  minimum_liquidity: number;
  maximum_spread: number;
  fill_policy: AutomationPlan["fillPolicy"];
  exit_rules: AutomationPlan["exitRules"];
  runtime_config: Record<string, unknown> | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

function toPlan(row: PlanRow): AutomationPlan {
  return {
    id: row.id,
    name: row.name,
    budget: row.budget,
    riskLevel: row.risk_level,
    categories: row.categories ?? ["General"],
    scanMode: row.scan_mode,
    maxTradesPerDay: row.max_trades_per_day,
    mode: row.mode,
    maxDailyLoss: row.max_daily_loss,
    maxOpenPositions: row.max_open_positions,
    maxPctPerTrade: row.max_pct_per_trade,
    feeAlertThreshold: row.fee_alert_threshold,
    cooldownAfterLossStreak: row.cooldown_after_loss_streak,
    largeTraderSignals: row.large_trader_signals,
    closingSoonFocus: row.closing_soon_focus,
    slippage: row.slippage,
    minimumLiquidity: row.minimum_liquidity,
    maximumSpread: row.maximum_spread,
    fillPolicy: row.fill_policy,
    exitRules: row.exit_rules,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(plan: AutomationPlan, userId: string) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name,
    mode: plan.mode,
    budget: plan.budget,
    risk_level: plan.riskLevel,
    categories: plan.categories,
    scan_mode: plan.scanMode,
    max_trades_per_day: plan.maxTradesPerDay,
    max_daily_loss: plan.maxDailyLoss,
    max_open_positions: plan.maxOpenPositions,
    max_pct_per_trade: plan.maxPctPerTrade,
    fee_alert_threshold: plan.feeAlertThreshold,
    cooldown_after_loss_streak: plan.cooldownAfterLossStreak,
    large_trader_signals: plan.largeTraderSignals,
    closing_soon_focus: plan.closingSoonFocus,
    slippage: plan.slippage,
    minimum_liquidity: plan.minimumLiquidity,
    maximum_spread: plan.maximumSpread,
    fill_policy: plan.fillPolicy,
    exit_rules: plan.exitRules,
    runtime_config: {},
    is_default: plan.isDefault,
    is_archived: plan.isArchived,
  };
}

function isMissingPlansSchema(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("market_plans") === true;
}

async function unsetOtherDefaults(admin: ReturnType<typeof createAdminClient>, userId: string, excludeId?: string) {
  let query = admin.from("market_plans").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (excludeId) query = query.neq("id", excludeId);
  await query;
}

export const GET = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const { data, error } = await admin
      .from("market_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (isMissingPlansSchema(error)) return NextResponse.json({ plans: [], degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plans: (data ?? []).map((row) => toPlan(row as PlanRow)) });
  });

export const POST = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id);

    const { data, error } = await admin
      .from("market_plans")
      .insert(toRow(body, user.id))
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true }, { status: 201 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) }, { status: 201 });
  });

export const PATCH = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id, body.id);

    const { data, error } = await admin
      .from("market_plans")
      .update(toRow(body, user.id))
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) });
  });

export const DELETE = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });

    const { error } = await admin.from("market_plans").delete().eq("id", id).eq("user_id", user.id);
    if (isMissingPlansSchema(error)) return NextResponse.json({ ok: true, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
```