import type { MarketRuntimeConfig } from "@/lib/market/runtime-config";

export type LegacyDirectiveRow = {
  id: string;
  name: string;
  amount: number | string;
  timeframe: string;
  buys_per_day: number;
  risk_mix: "conservative" | "balanced" | "aggressive";
  whale_follow: boolean;
  focus_areas: string[];
  profit_strategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode: boolean;
  created_at: string;
  updated_at?: string;
};

export function mergeDirectiveWithRuntime(row: LegacyDirectiveRow, runtimeConfig: MarketRuntimeConfig) {
  return {
    ...row,
    paper_mode: runtimeConfig.paperMode,
    focus_areas: runtimeConfig.focusAreas,
    daily_loss_cap: runtimeConfig.dailyLossCap,
    moonshot_mode: runtimeConfig.moonshotMode,
    total_loss_cap: runtimeConfig.totalLossCap,
    auto_pause_losing_days: runtimeConfig.autoPauseLosingDays,
    target_profit_monthly: runtimeConfig.targetProfitMonthly,
    take_profit_pct: runtimeConfig.takeProfitPct,
    stop_loss_pct: runtimeConfig.stopLossPct,
    minimum_liquidity: runtimeConfig.minimumLiquidity,
    maximum_spread_pct: runtimeConfig.maximumSpreadPct,
    max_open_positions: runtimeConfig.maxOpenPositions,
    max_pct_per_trade: runtimeConfig.maxPctPerTrade,
    fee_alert_threshold: runtimeConfig.feeAlertThreshold,
    cooldown_after_loss_streak: runtimeConfig.cooldownAfterLossStreak,
    closing_soon_focus: runtimeConfig.closingSoonFocus,
    slippage_pct: runtimeConfig.slippagePct,
    fill_policy: runtimeConfig.fillPolicy,
    exit_rules: runtimeConfig.exitRules,
    runtime_config: runtimeConfig,
  };
}

export function mergeMarketBotMetadata(
  existingMetadata: Record<string, unknown>,
  runtimeConfig: MarketRuntimeConfig,
) {
  return {
    ...existingMetadata,
    marketBotConfig: {
      ...(existingMetadata.marketBotConfig && typeof existingMetadata.marketBotConfig === "object"
        ? (existingMetadata.marketBotConfig as Record<string, unknown>)
        : {}),
      ...runtimeConfig,
    },
  };
}