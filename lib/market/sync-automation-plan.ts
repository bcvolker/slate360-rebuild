import type { AutomationPlan } from "@/components/dashboard/market/types";
import { buildRuntimeConfig } from "@/lib/market/runtime-config";

export interface SyncResult {
  ok: boolean;
  status: number;
  error?: string;
  directiveId?: string;
}

export async function syncAutomationPlan(plan: AutomationPlan): Promise<SyncResult> {
  const profitStrategy = plan.fillPolicy === "limit-only"
    ? "market-making"
    : plan.riskLevel === "aggressive"
      ? "longshot"
      : "arbitrage";

  const timeframe = plan.scanMode === "closing-soon"
    ? "24h"
    : plan.scanMode === "fast"
      ? "12h"
      : plan.scanMode === "slow"
        ? "1w"
        : "3d";

  const runtimeConfig = buildRuntimeConfig({
    capitalAlloc: plan.budget,
    maxTradesPerDay: plan.maxTradesPerDay,
    maxOpenPositions: plan.maxOpenPositions,
    paperMode: plan.mode === "practice",
    focusAreas: plan.categories,
    timeframe,
    minimumLiquidity: plan.minimumLiquidity,
    maximumSpreadPct: plan.maximumSpread,
    maxPctPerTrade: plan.maxPctPerTrade,
    feeAlertThreshold: plan.feeAlertThreshold,
    cooldownAfterLossStreak: plan.cooldownAfterLossStreak,
    largeTraderSignals: plan.largeTraderSignals,
    closingSoonFocus: plan.closingSoonFocus,
    slippagePct: plan.slippage,
    fillPolicy: plan.fillPolicy,
    exitRules: plan.exitRules,
    dailyLossCap: plan.maxDailyLoss,
    moonshotMode: plan.riskLevel === "aggressive" && plan.scanMode === "fast",
    totalLossCap: Math.max(plan.maxDailyLoss * 5, plan.budget * 0.5),
    autoPauseLosingDays: Math.max(1, plan.cooldownAfterLossStreak),
    targetProfitMonthly: null,
    takeProfitPct: 20,
    stopLossPct: 10,
  });

  const body = {
    name: plan.name,
    amount: plan.budget,
    timeframe,
    buys_per_day: plan.maxTradesPerDay,
    risk_mix: plan.riskLevel,
    whale_follow: plan.largeTraderSignals,
    focus_areas: runtimeConfig.focusAreas,
    profit_strategy: profitStrategy,
    paper_mode: plan.mode === "practice",
    daily_loss_cap: plan.maxDailyLoss,
    moonshot_mode: plan.riskLevel === "aggressive" && plan.scanMode === "fast",
    total_loss_cap: Math.max(plan.maxDailyLoss * 5, plan.budget * 0.5),
    auto_pause_losing_days: Math.max(1, plan.cooldownAfterLossStreak),
    target_profit_monthly: null,
    take_profit_pct: 20,
    stop_loss_pct: 10,
    runtime_config: runtimeConfig,
  };

  const response = await fetch("/api/market/directives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    return {
      ok: false,
      status: response.status,
      error: typeof errData.error === "string" ? errData.error : `HTTP ${response.status}`,
    };
  }

  const data = await response.json() as { directive?: { id?: string } };
  return { ok: true, status: response.status, directiveId: data.directive?.id };
}

/** Also set bot-status to running/paper so the scheduler picks it up */
export async function ensureBotRunning(paperMode: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/market/bot-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: paperMode ? "paper" : "running" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}