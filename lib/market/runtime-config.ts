import type { FocusArea, MarketOpportunity } from "@/lib/market-bot";

export type MarketPlanRuntimeRow = {
  mode: "practice" | "real";
  budget: number | string | null;
  risk_level: "conservative" | "balanced" | "aggressive" | null;
  categories: string[] | null;
  scan_mode: "slow" | "balanced" | "fast" | "closing-soon" | null;
  max_trades_per_day: number | null;
  max_daily_loss: number | string | null;
  max_open_positions: number | null;
  max_pct_per_trade: number | string | null;
  fee_alert_threshold: number | string | null;
  cooldown_after_loss_streak: number | null;
  large_trader_signals: boolean | null;
  closing_soon_focus: boolean | null;
  slippage: number | string | null;
  minimum_liquidity: number | string | null;
  maximum_spread: number | string | null;
  fill_policy: "aggressive" | "conservative" | "limit-only" | null;
  exit_rules: "auto" | "manual" | "trailing-stop" | null;
  runtime_config: Record<string, unknown> | null;
};

export type MarketDirectiveRuntimeRow = {
  amount: number | string | null;
  buys_per_day: number | null;
  risk_mix: "conservative" | "balanced" | "aggressive" | null;
  focus_areas: string[] | null;
  paper_mode: boolean | null;
  timeframe: string | null;
};

export type MarketRuntimeConfig = {
  capitalAlloc: number;
  maxTradesPerDay: number;
  maxOpenPositions: number;
  paperMode: boolean;
  focusAreas: FocusArea[];
  timeframe: string;
  timeframeHours: number | null;
  minimumLiquidity: number;
  maximumSpreadPct: number | null;
  maxPctPerTrade: number | null;
  feeAlertThreshold: number | null;
  cooldownAfterLossStreak: number;
  largeTraderSignals: boolean;
  closingSoonFocus: boolean;
  slippagePct: number | null;
  fillPolicy: "aggressive" | "conservative" | "limit-only";
  exitRules: "auto" | "manual" | "trailing-stop";
  dailyLossCap: number;
  moonshotMode: boolean;
  totalLossCap: number;
  autoPauseLosingDays: number;
  targetProfitMonthly: number | null;
  takeProfitPct: number;
  stopLossPct: number;
  minProbabilityPct: number;
  maxProbabilityPct: number;
};

type RuntimeConfigInput = {
  capitalAlloc?: number | string | null;
  maxTradesPerDay?: number | string | null;
  maxOpenPositions?: number | string | null;
  paperMode?: boolean;
  focusAreas?: string[] | null;
  timeframe?: string | null;
  timeframeHours?: number | string | null;
  minimumLiquidity?: number | string | null;
  maximumSpreadPct?: number | string | null;
  maximumSpread?: number | string | null;
  maxPctPerTrade?: number | string | null;
  feeAlertThreshold?: number | string | null;
  cooldownAfterLossStreak?: number | string | null;
  largeTraderSignals?: boolean;
  closingSoonFocus?: boolean;
  slippagePct?: number | string | null;
  slippage?: number | string | null;
  fillPolicy?: string | null;
  exitRules?: string | null;
  dailyLossCap?: number | string | null;
  moonshotMode?: boolean;
  totalLossCap?: number | string | null;
  autoPauseLosingDays?: number | string | null;
  targetProfitMonthly?: number | string | null;
  takeProfitPct?: number | string | null;
  stopLossPct?: number | string | null;
  minProbabilityPct?: number | string | null;
  maxProbabilityPct?: number | string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFocusArea(value: string): FocusArea | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "all" || normalized === "general") return "all";
  if (normalized === "real estate" || normalized === "real-estate") return "real-estate";
  if (normalized === "construction") return "construction";
  if (normalized === "economy" || normalized === "finance") return "economy";
  if (normalized === "politics") return "politics";
  if (normalized === "sports") return "sports";
  if (normalized === "crypto") return "crypto";
  if (normalized === "weather") return "weather";
  if (normalized === "entertainment") return "entertainment";
  return null;
}

export function normalizeFocusAreas(values: string[] | null | undefined): FocusArea[] {
  const normalized = (values ?? [])
    .map(normalizeFocusArea)
    .filter((value): value is FocusArea => value !== null);

  const unique = Array.from(new Set(normalized));
  if (unique.length === 0) return ["all"];
  if (unique.includes("all") && unique.length > 1) {
    return unique.filter((value) => value !== "all");
  }
  return unique;
}

export function timeframeToHours(timeframe: string | null | undefined): number | null {
  const normalized = String(timeframe ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "12h") return 12;
  if (normalized === "24h") return 24;
  if (normalized === "3d") return 72;
  if (normalized === "1w") return 168;

  const match = normalized.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (match[2] === "h") return amount;
  if (match[2] === "d") return amount * 24;
  return amount * 24 * 7;
}

function scanModeToTimeframe(scanMode: MarketPlanRuntimeRow["scan_mode"], closingSoonFocus: boolean | null): string {
  if (closingSoonFocus || scanMode === "closing-soon") return "24h";
  if (scanMode === "fast") return "12h";
  if (scanMode === "slow") return "1w";
  return "3d";
}

export function buildRuntimeConfig(input?: RuntimeConfigInput): MarketRuntimeConfig {
  const source = input ?? {};
  const timeframe = String(source.timeframe ?? "3d");
  const explicitTimeframeHours = toFiniteNumber(source.timeframeHours);
  const timeframeHours = explicitTimeframeHours ?? timeframeToHours(timeframe);
  const closingSoonFocus = source.closingSoonFocus === true;

  return {
    capitalAlloc: Math.max(1, toFiniteNumber(source.capitalAlloc) ?? 200),
    maxTradesPerDay: clamp(Math.round(toFiniteNumber(source.maxTradesPerDay) ?? 5), 1, 100000),
    maxOpenPositions: clamp(Math.round(toFiniteNumber(source.maxOpenPositions) ?? 3), 1, 100000),
    paperMode: source.paperMode !== false,
    focusAreas: normalizeFocusAreas(source.focusAreas),
    timeframe,
    timeframeHours: closingSoonFocus ? 24 : timeframeHours,
    minimumLiquidity: Math.max(0, toFiniteNumber(source.minimumLiquidity) ?? 1000),
    maximumSpreadPct: Math.max(0, toFiniteNumber(source.maximumSpreadPct ?? source.maximumSpread) ?? 5),
    maxPctPerTrade: Math.max(0, toFiniteNumber(source.maxPctPerTrade) ?? 10),
    feeAlertThreshold: Math.max(0, toFiniteNumber(source.feeAlertThreshold) ?? 5),
    cooldownAfterLossStreak: clamp(Math.round(toFiniteNumber(source.cooldownAfterLossStreak) ?? 2), 0, 30),
    largeTraderSignals: source.largeTraderSignals === true,
    closingSoonFocus,
    slippagePct: Math.max(0, toFiniteNumber(source.slippagePct ?? source.slippage) ?? 2),
    fillPolicy:
      source.fillPolicy === "aggressive" || source.fillPolicy === "limit-only"
        ? source.fillPolicy
        : "conservative",
    exitRules:
      source.exitRules === "manual" || source.exitRules === "trailing-stop"
        ? source.exitRules
        : "auto",
    dailyLossCap: Math.max(1, toFiniteNumber(source.dailyLossCap) ?? 40),
    moonshotMode: source.moonshotMode === true,
    totalLossCap: Math.max(1, toFiniteNumber(source.totalLossCap) ?? 200),
    autoPauseLosingDays: clamp(Math.round(toFiniteNumber(source.autoPauseLosingDays) ?? 3), 1, 30),
    targetProfitMonthly: toFiniteNumber(source.targetProfitMonthly),
    takeProfitPct: Math.max(1, toFiniteNumber(source.takeProfitPct) ?? 20),
    stopLossPct: Math.max(1, toFiniteNumber(source.stopLossPct) ?? 10),
    minProbabilityPct: clamp(toFiniteNumber(source.minProbabilityPct) ?? 5, 0, 100),
    maxProbabilityPct: clamp(toFiniteNumber(source.maxProbabilityPct) ?? 95, 0, 100),
  };
}

export function buildRuntimeConfigFromPlan(
  plan: MarketPlanRuntimeRow,
  metadata?: Record<string, unknown>,
): MarketRuntimeConfig {
  const runtimeOverrides = plan.runtime_config && typeof plan.runtime_config === "object" ? plan.runtime_config : {};
  const dailyLossCap = toFiniteNumber(plan.max_daily_loss) ?? 40;
  const budget = toFiniteNumber(plan.budget) ?? 200;

  return buildRuntimeConfig({
    ...(metadata ?? {}),
    ...runtimeOverrides,
    capitalAlloc: plan.budget,
    maxTradesPerDay: plan.max_trades_per_day,
    maxOpenPositions: plan.max_open_positions,
    paperMode: plan.mode !== "real",
    focusAreas: plan.categories,
    timeframe:
      typeof runtimeOverrides.timeframe === "string"
        ? runtimeOverrides.timeframe
        : scanModeToTimeframe(plan.scan_mode, plan.closing_soon_focus),
    minimumLiquidity: plan.minimum_liquidity,
    maximumSpread: plan.maximum_spread,
    maxPctPerTrade: plan.max_pct_per_trade,
    feeAlertThreshold: plan.fee_alert_threshold,
    cooldownAfterLossStreak: plan.cooldown_after_loss_streak,
    largeTraderSignals: plan.large_trader_signals === true,
    closingSoonFocus: plan.closing_soon_focus === true,
    slippage: plan.slippage,
    fillPolicy: plan.fill_policy,
    exitRules: plan.exit_rules,
    dailyLossCap: plan.max_daily_loss,
    moonshotMode:
      typeof runtimeOverrides.moonshotMode === "boolean"
        ? runtimeOverrides.moonshotMode
        : plan.risk_level === "aggressive" && plan.scan_mode === "fast",
    totalLossCap: toFiniteNumber(runtimeOverrides.totalLossCap) ?? Math.max(dailyLossCap * 5, budget * 0.5),
    autoPauseLosingDays: toFiniteNumber(runtimeOverrides.autoPauseLosingDays) ?? plan.cooldown_after_loss_streak,
    targetProfitMonthly: toFiniteNumber(runtimeOverrides.targetProfitMonthly),
    takeProfitPct: toFiniteNumber(runtimeOverrides.takeProfitPct) ?? 20,
    stopLossPct: toFiniteNumber(runtimeOverrides.stopLossPct) ?? 10,
  });
}

export function buildRuntimeConfigFromDirective(
  directive: MarketDirectiveRuntimeRow | null,
  runtimeStatus: "running" | "paused" | "stopped" | "paper",
  metadata?: Record<string, unknown>,
): MarketRuntimeConfig {
  return buildRuntimeConfig({
    ...(metadata ?? {}),
    capitalAlloc: directive?.amount,
    maxTradesPerDay: directive?.buys_per_day,
    paperMode: directive?.paper_mode ?? runtimeStatus !== "running",
    focusAreas: directive?.focus_areas,
    timeframe: directive?.timeframe,
  });
}

export function filterExecutableOpportunities(
  opportunities: MarketOpportunity[],
  filters: {
    minEdgePct: number;
    minVolumeUsd: number;
    minProbabilityPct: number;
    maxProbabilityPct: number;
    timeframeHours: number | null;
    maxSpreadPct: number | null;
  },
): MarketOpportunity[] {
  const now = Date.now();

  return opportunities.filter((opp) => {
    const probabilityPct = opp.yesPrice * 100;
    if (opp.edge < filters.minEdgePct) return false;
    if (opp.volume24h < filters.minVolumeUsd) return false;
    if (probabilityPct < filters.minProbabilityPct || probabilityPct > filters.maxProbabilityPct) {
      return false;
    }
    if (filters.maxSpreadPct != null && opp.edge > filters.maxSpreadPct) return false;
    if (filters.timeframeHours != null) {
      const expiry = new Date(opp.expiresAt).getTime();
      if (Number.isFinite(expiry)) {
        const hoursUntilExpiry = (expiry - now) / 3_600_000;
        if (hoursUntilExpiry > filters.timeframeHours) return false;
      }
    }
    return true;
  });
}