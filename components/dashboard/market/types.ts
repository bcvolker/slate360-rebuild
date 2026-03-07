export interface BuyDirective {
  id?: string;
  name: string;
  amount: number;
  timeframe: string;
  buys_per_day: number;
  risk_mix: "conservative" | "balanced" | "aggressive";
  whale_follow: boolean;
  focus_areas: string[];
  profit_strategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode: boolean;
  daily_loss_cap?: number;
  moonshot_mode?: boolean;
  total_loss_cap?: number;
  auto_pause_losing_days?: number;
  target_profit_monthly?: number | null;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  created_at?: string;
}

export interface MarketActivityLogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string;
}

// ── Shared domain types ────────────────────────────────────────────────────

export type { MarketViewModel, TradeViewModel, SchedulerHealthViewModel, MarketSummaryViewModel, WhaleActivityViewModel } from "@/lib/market/contracts";

export interface MarketListing {
  id: string;
  title: string;
  category: string;
  probabilityPct: number;
  yesPrice: number;
  noPrice: number;
  volume24hUsd: number;
  liquidityUsd: number;
  edgePct: number;
  riskTag: "hot" | "high-risk" | "construction" | "high-potential" | null;
  endDate: string | null;
  endDateIso?: string | null;
  tokenIdYes?: string | null;
  tokenIdNo?: string | null;
  bookmarked: boolean;
  endDateLabel?: string;
  liquidity?: number;
}

export interface MarketTrade {
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
  category?: string;
  probability?: number;
  volume?: number;
}

export interface LiveChecklist {
  walletConnected: boolean;
  polygonSelected: boolean;
  usdcFunded: boolean;
  signatureVerified: boolean;
  usdcApproved: boolean;
}

export interface SimRun {
  id: string;
  name: string;
  created_at: string;
  config: BuyDirective;
  pnl_data: { label: string; pnl: number }[];
  total_pnl: number;
  win_rate: number;
  trade_count: number;
  // Simulation labels (Batch 4)
  fillModel?: "realistic" | "ideal";
  feeMode?: boolean;
  partialFills?: boolean;
  startingBalance?: number;
}

export type PnlPoint = { label: string; pnl: number; cumPnl: number };
export type MarketSortKey = "volume" | "edge" | "probability" | "title" | "endDate" | "yesPrice" | "noPrice" | "signal";
export type MarketSortDirection = "asc" | "desc";
export type MktRiskTag = "all" | "hot" | "high-risk" | "construction" | "high-potential" | "none";
export type MktTimeframe = "hour" | "day" | "week" | "month" | "year" | "all" | "today" | "tomorrow";

// ── Simulation types ───────────────────────────────────────────────────────

export interface SimulationConfig {
  startingBalance: number;
  fillModel: "realistic" | "ideal";
  feeMode: boolean;
  partialFills: boolean;
}

// ── Automation plan types ──────────────────────────────────────────────────

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type ScanMode = "slow" | "balanced" | "fast" | "closing-soon";
export type FillPolicy = "aggressive" | "conservative" | "limit-only";
export type ExitRules = "auto" | "manual" | "trailing-stop";

export interface AutomationPlan {
  id: string;
  name: string;
  // Basic
  budget: number;
  riskLevel: RiskLevel;
  categories: string[];
  scanMode: ScanMode;
  maxTradesPerDay: number;
  mode: "practice" | "real";
  maxDailyLoss: number;
  maxOpenPositions: number;
  // Intermediate
  maxPctPerTrade: number;
  feeAlertThreshold: number;
  cooldownAfterLossStreak: number;
  largeTraderSignals: boolean;
  closingSoonFocus: boolean;
  // Advanced
  slippage: number;
  minimumLiquidity: number;
  maximumSpread: number;
  fillPolicy: FillPolicy;
  exitRules: ExitRules;
  // Metadata
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  paperMode: boolean;
  botRunning: boolean;
  botPaused: boolean;
  scanning: boolean;
  lastScan: number | null;
  capitalAlloc: number;
  maxTradesPerDay: number;
  maxPositions: number;
  minEdge: number;
  minVolume: number;
  minProbLow: number;
  minProbHigh: number;
  riskMix: "conservative" | "balanced" | "aggressive";
  whaleFollow: boolean;
  focusAreas: string[];
}

// ── Results analytics types ────────────────────────────────────────────────

export interface ResultsAnalytics {
  realizedPnl: number;
  unrealizedPnl: number;
  feeAdjustedPnl: number;
  totalPnl: number;
  expectancy: number;
  profitFactor: number;
  winRate: number;
  avgHoldTimeMs: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  pnlByCategory: { category: string; pnl: number; count: number }[];
  paperVsLive: { mode: "paper" | "live"; pnl: number; count: number; winRate: number }[];
}

export interface TradeReplay {
  trade: MarketTrade;
  reasoning: string | null;
  exitReason: string | null;
  matchedConstraints: string[];
}
