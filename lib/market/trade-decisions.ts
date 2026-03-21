/**
 * Trade decision logic — decides which markets to buy and how many shares.
 * Extracted from market-bot.ts to keep files under 300 lines.
 */

import type { BotConfig, MarketOpportunity, RiskLevel, TradeRecord } from "@/lib/market-bot";

export function decideTrades(
  opportunities: MarketOpportunity[],
  config: BotConfig,
  dailyPnl: number,
): { opp: MarketOpportunity; side: "YES" | "NO"; shares: number; reason: string }[] {
  const trades: { opp: MarketOpportunity; side: "YES" | "NO"; shares: number; reason: string }[] = [];

  if (dailyPnl <= -config.maxDailyLoss) {
    return [];
  }

  const remainingBudget = config.maxDailyLoss + dailyPnl;
  if (remainingBudget <= 0) return [];

  for (const opp of opportunities) {
    const mixPct = config.portfolioMix[opp.riskTier] ?? 0;
    if (mixPct === 0) continue;

    const minConfidence: Record<RiskLevel, number> = {
      low: 25,
      medium: 15,
      high: 5,
    };

    if (opp.confidence < minConfidence[config.riskLevel]) continue;

    if (!config.focusAreas.includes("all") && !config.focusAreas.includes(opp.category)) {
      continue;
    }

    const side: "YES" | "NO" = opp.yesPrice < opp.noPrice ? "YES" : "NO";
    const price = side === "YES" ? opp.yesPrice : opp.noPrice;

    const budgetForTier = (remainingBudget * mixPct) / 100;
    const configuredMaxPositionUsd = Number.isFinite(config.maxPositionUsd)
      ? Math.max(config.maxPositionUsd, 1)
      : 50;
    const maxPositionSize = Math.min(budgetForTier, configuredMaxPositionUsd);

    // Kelly criterion: optimal fraction = (odds * winProb - lossProb) / odds
    // Half-Kelly for safety (less aggressive, smoother growth)
    const winProb = Math.min(0.95, Math.max(0.05, opp.confidence / 100));
    const lossProb = 1 - winProb;
    const odds = (1 / price) - 1;
    const kellyFraction = odds > 0
      ? Math.max(0, (odds * winProb - lossProb) / odds)
      : 0;
    const halfKelly = kellyFraction / 2;
    const kellyBudget = halfKelly > 0 ? maxPositionSize * halfKelly : maxPositionSize;
    const effectiveBudget = Math.min(maxPositionSize, Math.max(1, kellyBudget));

    const shares = Math.max(1, Math.floor(effectiveBudget / price));

    if (shares * price < 1) continue;

    const reason = opp.isArbitrage
      ? `Arbitrage: YES+NO=$${(opp.yesPrice + opp.noPrice).toFixed(3)} (guaranteed ${opp.edge}% profit)`
      : `${opp.edge}% value, ${opp.confidence}% confidence, ${opp.riskTier} risk`;

    trades.push({ opp, side, shares, reason });

    const maxTradesPerScan = Number.isFinite(config.maxTradesPerScan)
      ? Math.max(1, Math.floor(config.maxTradesPerScan))
      : 3;
    if (trades.length >= maxTradesPerScan) break;
  }

  return trades;
}

export function simulatePaperTrade(
  userId: string,
  opp: MarketOpportunity,
  side: "YES" | "NO",
  shares: number,
): TradeRecord {
  const price = side === "YES" ? opp.yesPrice : opp.noPrice;
  return {
    id: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    marketId: opp.id,
    question: opp.question,
    side,
    shares,
    price,
    total: Math.round(shares * price * 100) / 100,
    status: "open",
    pnl: null,
    paperTrade: true,
    createdAt: new Date().toISOString(),
    closedAt: null,
  };
}
