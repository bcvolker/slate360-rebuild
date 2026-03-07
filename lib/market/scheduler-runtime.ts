import { buildRuntimeConfig, type MarketRuntimeConfig } from "@/lib/market/runtime-config";

type DirectiveSchedulerShape = {
  amount: number | string | null;
  buys_per_day: number | null;
  paper_mode: boolean | null;
  focus_areas: string[] | null;
  timeframe: string | null;
};

export function buildSchedulerRuntimeConfig(
  directiveRow: DirectiveSchedulerShape | null,
  runtimeStatus: "running" | "paused" | "stopped" | "paper",
  userMetadata: Record<string, unknown> | undefined,
): MarketRuntimeConfig {
  return buildRuntimeConfig({
    ...(userMetadata ?? {}),
    capitalAlloc: directiveRow?.amount,
    maxTradesPerDay: directiveRow?.buys_per_day,
    paperMode: directiveRow?.paper_mode ?? runtimeStatus !== "running",
    focusAreas: directiveRow?.focus_areas ?? undefined,
    timeframe: directiveRow?.timeframe ?? undefined,
  });
}

export function applyDecisionShareCaps<T extends { side: "YES" | "NO"; shares: number; opp: { yesPrice: number; noPrice: number } }>(
  decisions: T[],
  capitalBase: number,
  runtimeConfig: MarketRuntimeConfig,
  maxDecisions: number,
): T[] {
  return decisions
    .map((decision) => {
      const price = decision.side === "YES" ? decision.opp.yesPrice : decision.opp.noPrice;
      const maxSharesByPortfolioPct = runtimeConfig.maxPctPerTrade
        ? Math.floor(((capitalBase * runtimeConfig.maxPctPerTrade) / 100) / Math.max(price, 0.01))
        : decision.shares;
      return {
        ...decision,
        shares: Math.max(1, Math.min(decision.shares, Math.max(1, maxSharesByPortfolioPct))),
      };
    })
    .slice(0, maxDecisions);
}