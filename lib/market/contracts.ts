export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
    ignoredKeys?: string[];
    appliedConfig?: ScanAppliedConfig;
    summary?: {
      dailyPnlUsd?: number;
      dailyVolumeUsd?: number;
      count?: number;
    };
  };
};

export type MarketRiskTag = "hot" | "high-risk" | "construction" | "high-potential" | null;

export type MarketViewModel = {
  id: string;
  title: string;
  category: string;
  probabilityPct: number;
  yesPrice: number;
  noPrice: number;
  volume24hUsd: number;
  liquidityUsd: number;
  edgePct: number;
  riskTag: MarketRiskTag;
  endDate: string | null;
  endDateIso?: string | null;
  eventStartIso?: string | null;
  eventStartTimeIso?: string | null;
  tokenIdYes?: string | null;
  tokenIdNo?: string | null;
};

export type WhaleActivityViewModel = {
  whaleAddress: string;
  marketTitle: string;
  outcome: "YES" | "NO";
  shares: number;
  amountUsd: number;
  timestamp: string;
  category: string;
};

export type TradeViewModel = {
  id: string;
  marketId: string;
  marketTitle: string;
  outcome: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  total: number;
  pnl: number;
  status: string;
  paperTrade: boolean;
  reason: string | null;
  createdAt: string;
  closedAt: string | null;
};

export type DirectiveViewModel = {
  id: string;
  name: string;
  amount: number;
  timeframe: string;
  buysPerDay: number;
  riskMix: "conservative" | "balanced" | "aggressive";
  whaleFollow: boolean;
  focusAreas: string[];
  profitStrategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paperMode: boolean;
  dailyLossCap: number;
  moonshotMode: boolean;
  totalLossCap: number;
  autoPauseLosingDays: number;
  targetProfitMonthly: number | null;
  takeProfitPct: number;
  stopLossPct: number;
  createdAt: string;
  updatedAt: string;
};

export type BotStatusViewModel = {
  status: "running" | "paused" | "stopped" | "paper";
  updatedAt: string | null;
};

export type MarketSummaryViewModel = {
  mode: "paper" | "live";
  startingBalanceUsd: number;
  currentBalanceUsd: number;
  availableCashUsd: number;
  totalProfitLossUsd: number;
  todayProfitLossUsd: number;
  openPositions: number;
  totalTrades: number;
  winRatePct: number;
  averageTradeUsd: number;
  averageProfitUsd: number;
  bestDayUsd: number;
  worstDayUsd: number;
  lastRunIso: string | null;
  runFrequencySeconds: number | null;
};

export type SchedulerHealthViewModel = {
  status: "running" | "paused" | "stopped" | "paper";
  runsToday: number;
  tradesToday: number;
  runFrequencySeconds: number;
  lastRunIso: string | null;
  lastScanIso: string | null;
  nextEligibleRunIso: string | null;
  lastError: string | null;
  lastErrorAtIso: string | null;
  updatedAtIso: string | null;
};

export type MarketSystemBlocker = {
  code: string;
  label: string;
  detail: string;
  severity: "info" | "warning" | "critical";
};

export type MarketSystemStatusViewModel = {
  configSource: "market_plans" | "market_directives" | "user_metadata" | "defaults";
  configSourceLabel: string;
  runtimeStatus: "running" | "paused" | "stopped" | "paper";
  practiceReady: boolean;
  liveServerReady: boolean;
  liveEnvReady: boolean;
  planCount: number;
  effectiveMaxOpenPositions: number;
  tradeCount: number;
  hasLegacyDirective: boolean;
  hasRuntimeMetadata: boolean;
  runsToday: number;
  tradesToday: number;
  lastRunIso: string | null;
  blockers: MarketSystemBlocker[];
  recommendation: string;
};

export type ScanRequest = {
  paperMode: boolean;
  executeTrades?: boolean;
  maxPositions: number;
  capitalPerTrade: number;
  minEdge: number;
  minVolume: number;
  minProbability: number;
  maxProbability: number;
  whaleFollow: boolean;
  riskMix: "conservative" | "balanced" | "aggressive";
  focusAreas: string[];
};

export type ScanDecision = {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  why: string;
  edge: number;
};

export type ScanAppliedConfig = {
  paperMode: boolean;
  executeTrades?: boolean;
  maxPositions: number;
  capitalPerTrade: number;
  minEdgePct: number;
  minVolumeUsd: number;
  minProbabilityPct: number;
  maxProbabilityPct: number;
  riskMix: "conservative" | "balanced" | "aggressive";
  focusAreas: string[];
  whaleFollow: boolean;
};

export type ScanResponse = {
  scannedAtIso: string;
  marketsScanned: number;
  opportunitiesFound: number;
  decisions: ScanDecision[];
  executed: TradeViewModel[];
  appliedConfig: ScanAppliedConfig;
};

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function toNumberOrZero(value: unknown): number {
  return toNumberOrNull(value) ?? 0;
}
