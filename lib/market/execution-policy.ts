/**
 * Unified trade execution policy for both direct buy and automation scan routes.
 *
 * Extracts the common validation, position sizing, and safety constraint logic
 * so that manual and automated trades are subjected to the exact same rules.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Constants ─────────────────────────────────────────────── */

const DEFAULT_MIN_BUY_USD = 1;
const DEFAULT_MAX_BUY_USD = 1_000_000;

/* ─── Types ─────────────────────────────────────────────────── */

export interface TradeValidationInput {
  amount: number;
  avgPrice: number;
  outcome: "YES" | "NO";
}

export interface PositionSizingInput {
  amount: number;
  avgPrice: number;
  /** Portfolio-level max % per trade (e.g. 10 = 10%). Null = no portfolio cap. */
  maxPctPerTrade: number | null;
  /** Total capital allocation for portfolio sizing. */
  capitalAlloc: number;
}

export interface SafetyConstraintInput {
  userId: string;
  supabase: SupabaseClient;
  maxOpenPositions: number;
}

export interface BuyLimits {
  minBuyUsd: number;
  maxBuyUsd: number;
}

export interface PositionSizingResult {
  shares: number;
  maxPayout: number;
  cappedByPortfolio: boolean;
}

export interface SafetyCheckResult {
  dailyPnl: number;
  openPositionsCount: number;
  remainingOpenSlots: number;
  allowed: boolean;
  reason?: string;
}

/* ─── Validation ────────────────────────────────────────────── */

export function getBuyLimits(): BuyLimits {
  const envMin = Number(process.env.MARKET_BUY_MIN_USD ?? DEFAULT_MIN_BUY_USD);
  const envMax = Number(process.env.MARKET_BUY_MAX_USD ?? DEFAULT_MAX_BUY_USD);
  const minBuyUsd = Number.isFinite(envMin) && envMin > 0 ? envMin : DEFAULT_MIN_BUY_USD;
  const maxBuyUsd = Number.isFinite(envMax) && envMax >= minBuyUsd ? envMax : DEFAULT_MAX_BUY_USD;
  return { minBuyUsd, maxBuyUsd };
}

export function validateTradeInput(input: TradeValidationInput): string | null {
  if (!["YES", "NO"].includes(input.outcome)) {
    return "Invalid outcome — must be YES or NO";
  }

  if (typeof input.amount !== "number" || !Number.isFinite(input.amount)) {
    return "Amount must be a finite number";
  }

  if (typeof input.avgPrice !== "number" || !Number.isFinite(input.avgPrice)) {
    return "Average price must be a finite number";
  }

  const { minBuyUsd, maxBuyUsd } = getBuyLimits();
  if (input.amount < minBuyUsd || input.amount > maxBuyUsd) {
    return `Amount out of range ($${minBuyUsd.toLocaleString()}–$${maxBuyUsd.toLocaleString()})`;
  }

  return null;
}

/* ─── Position Sizing ───────────────────────────────────────── */

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  const price = Math.max(input.avgPrice, 0.01);
  const maxSharesByCapital = Math.floor(input.amount / price);

  let cappedByPortfolio = false;
  let maxSharesByPortfolioPct = maxSharesByCapital;

  if (input.maxPctPerTrade != null && input.maxPctPerTrade > 0 && input.capitalAlloc > 0) {
    maxSharesByPortfolioPct = Math.floor(
      ((input.capitalAlloc * input.maxPctPerTrade) / 100) / price,
    );
  }

  const shares = Math.max(1, Math.min(maxSharesByCapital, maxSharesByPortfolioPct));

  if (shares < maxSharesByCapital && maxSharesByPortfolioPct < maxSharesByCapital) {
    cappedByPortfolio = true;
  }

  return {
    shares: parseFloat(shares.toFixed(4)),
    maxPayout: parseFloat((shares * 1).toFixed(4)),
    cappedByPortfolio,
  };
}

/* ─── Fee Threshold Guard ───────────────────────────────────── */

/**
 * Checks whether a trade's edge is large enough to be profitable after fees.
 * Returns null if the trade is safe, or a reason string if it should be skipped.
 *
 * Default fee estimate: 0.5% — most Polymarket markets have 0% fees.
 * Some crypto markets charge up to 1.56% taker at 50/50 odds.
 * Gas is gasless via Builder keys (Polymarket pays).
 */
export function checkFeeThreshold(
  edgePct: number,
  isArbitrage: boolean,
  feeEstimatePct = 0.5,
): string | null {
  // Arbitrage trades are inherently profitable (YES+NO < $1), skip fee check
  if (isArbitrage) return null;

  if (edgePct <= feeEstimatePct) {
    return `Skipped: ${edgePct.toFixed(1)}% value is below ${feeEstimatePct}% fee threshold`;
  }

  return null;
}

/* ─── Safety Constraints ────────────────────────────────────── */

export async function checkSafetyConstraints(
  input: SafetyConstraintInput,
): Promise<SafetyCheckResult> {
  const today = new Date().toISOString().split("T")[0];

  const [{ data: todayTrades }, { data: openTrades }] = await Promise.all([
    input.supabase
      .from("market_trades")
      .select("pnl")
      .eq("user_id", input.userId)
      .gte("created_at", `${today}T00:00:00Z`),
    input.supabase
      .from("market_trades")
      .select("id")
      .eq("user_id", input.userId)
      .eq("status", "open"),
  ]);

  const dailyPnl = todayTrades?.reduce(
    (sum, t) => sum + (typeof t.pnl === "number" ? t.pnl : Number(t.pnl) || 0),
    0,
  ) ?? 0;

  const openPositionsCount = openTrades?.length ?? 0;
  const remainingOpenSlots = Math.max(0, input.maxOpenPositions - openPositionsCount);

  if (remainingOpenSlots <= 0) {
    return {
      dailyPnl,
      openPositionsCount,
      remainingOpenSlots: 0,
      allowed: false,
      reason: `Open position limit reached (${openPositionsCount}/${input.maxOpenPositions})`,
    };
  }

  return {
    dailyPnl,
    openPositionsCount,
    remainingOpenSlots,
    allowed: true,
  };
}
