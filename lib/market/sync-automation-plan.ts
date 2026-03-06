import type { AutomationPlan } from "@/components/dashboard/market/types";

export async function syncAutomationPlan(plan: AutomationPlan): Promise<{ ok: boolean; status: number }> {
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

  const response = await fetch("/api/market/directives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: plan.name,
      amount: plan.budget,
      timeframe,
      buys_per_day: plan.maxTradesPerDay,
      risk_mix: plan.riskLevel,
      whale_follow: plan.largeTraderSignals,
      focus_areas: plan.categories,
      profit_strategy: profitStrategy,
      paper_mode: plan.mode === "practice",
      daily_loss_cap: plan.maxDailyLoss,
      moonshot_mode: plan.riskLevel === "aggressive" && plan.scanMode === "fast",
      total_loss_cap: Math.max(plan.maxDailyLoss * 5, plan.budget * 0.5),
      auto_pause_losing_days: Math.max(1, plan.cooldownAfterLossStreak),
      target_profit_monthly: null,
      take_profit_pct: 20,
      stop_loss_pct: 10,
    }),
  });

  return { ok: response.ok, status: response.status };
}