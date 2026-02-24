/**
 * lib/market-bot.ts
 * The "brain" of the Polymarket trading bot.
 * Runs server-side — scans markets, evaluates opportunities,
 * and executes trades based on user risk/portfolio/focus settings.
 *
 * All wallet signing is done client-side — we never store private keys.
 */

/* ================================================================
   TYPES
   ================================================================ */

export type RiskLevel = "low" | "medium" | "high";

export type FocusArea =
  | "all"
  | "crypto"
  | "politics"
  | "sports"
  | "weather"
  | "economy";

export interface PortfolioMix {
  low: number;   // percentage
  medium: number;
  high: number;
}

export interface BotConfig {
  riskLevel: RiskLevel;
  maxDailyLoss: number;
  emergencyStopPct: number;
  maxTradesPerScan: number;
  maxPositionUsd: number;
  minOpportunityEdgePct: number;
  maxCandidates: number;
  paperMode: boolean;
  walletAddress: string | null;
  botStatus: "stopped" | "running" | "paper";
  portfolioMix: PortfolioMix;
  focusAreas: FocusArea[];
  whaleWatch: boolean;
}

export interface MarketOpportunity {
  id: string;
  question: string;
  category: FocusArea;
  yesPrice: number;
  noPrice: number;
  spread: number;
  edge: number;       // estimated percentage edge
  volume24h: number;
  liquidity: number;
  riskTier: RiskLevel;
  confidence: number;  // 0-100
  expiresAt: string;
}

export interface TradeRecord {
  id: string;
  userId: string;
  marketId: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  price: number;
  total: number;
  status: "open" | "closed" | "cancelled";
  pnl: number | null;
  paperTrade: boolean;
  createdAt: string;
  closedAt: string | null;
}

export const DEFAULT_CONFIG: BotConfig = {
  riskLevel: "low",
  paperMode: true,
  maxDailyLoss: 25,
  emergencyStopPct: 15,
  maxTradesPerScan: 25,
  maxPositionUsd: 250,
  minOpportunityEdgePct: 1,
  maxCandidates: 200,
  walletAddress: null,
  botStatus: "stopped",
  portfolioMix: { low: 60, medium: 30, high: 10 },
  focusAreas: ["all"],
  whaleWatch: false,
};

/* ================================================================
   POLYMARKET API HELPERS
   ================================================================ */

const POLY_API = "https://gamma-api.polymarket.com";

interface PolyMarket {
  id: string;
  question: string;
  category?: string;
  outcomes: string;
  outcomePrices: string;
  volume24hr: number;
  liquidity: number;
  endDate: string;
  active: boolean;
}

/**
 * Fetch active markets from Polymarket's public Gamma API.
 * Filters by focus areas if specified.
 */
export async function fetchMarkets(
  focusAreas: FocusArea[],
  limit = 50,
): Promise<PolyMarket[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      active: "true",
      closed: "false",
      order: "volume24hr",
      ascending: "false",
    });

    const res = await fetch(`${POLY_API}/markets?${params}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const markets: PolyMarket[] = await res.json();

    // Filter by focus areas
    if (!focusAreas.includes("all") && focusAreas.length > 0) {
      const categoryMap: Record<string, string[]> = {
        crypto: ["crypto", "bitcoin", "ethereum", "btc", "eth", "defi"],
        politics: ["politics", "election", "president", "congress", "vote"],
        sports: ["sports", "nfl", "nba", "mlb", "soccer", "football"],
        weather: ["weather", "hurricane", "temperature", "climate"],
        economy: ["economy", "gdp", "fed", "interest", "inflation", "construction"],
      };

      const keywords = focusAreas.flatMap((a) => categoryMap[a] ?? []);

      return markets.filter((m) => {
        const q = m.question.toLowerCase();
        const cat = (m.category ?? "").toLowerCase();
        return keywords.some((kw) => q.includes(kw) || cat.includes(kw));
      });
    }

    return markets;
  } catch (err) {
    console.error("[market-bot] fetchMarkets error:", err);
    return [];
  }
}

/* ================================================================
   OPPORTUNITY SCORING  ENGINE
   ================================================================ */

function categorize(question: string, category?: string): FocusArea {
  const q = (question + " " + (category ?? "")).toLowerCase();
  if (/crypto|bitcoin|btc|eth|defi|token/.test(q)) return "crypto";
  if (/president|congress|election|poll|vote|politic/.test(q)) return "politics";
  if (/nfl|nba|mlb|soccer|football|sport|game|match/.test(q)) return "sports";
  if (/weather|hurricane|temperature|storm|climate/.test(q)) return "weather";
  if (/economy|gdp|fed|inflation|construction|interest/.test(q)) return "economy";
  return "all";
}

function assessRisk(spread: number, liquidity: number, volume: number): RiskLevel {
  // Low: tight spread, high liquidity
  if (spread < 0.05 && liquidity > 50000) return "low";
  // High: wide spread or low liquidity
  if (spread > 0.15 || liquidity < 5000) return "high";
  return "medium";
}

/**
 * Score markets and return actionable opportunities sorted by edge.
 */
export function scoreOpportunities(
  markets: PolyMarket[],
  config: BotConfig,
): MarketOpportunity[] {
  const opps: MarketOpportunity[] = [];

  for (const mkt of markets) {
    try {
      const prices = JSON.parse(mkt.outcomePrices || "[]") as string[];
      if (prices.length < 2) continue;

      const yesPrice = parseFloat(prices[0]);
      const noPrice = parseFloat(prices[1]);
      if (isNaN(yesPrice) || isNaN(noPrice)) continue;

      const spread = Math.abs(1 - yesPrice - noPrice);
      const edge = spread * 100;

      const minEdge = Number.isFinite(config.minOpportunityEdgePct)
        ? Math.max(0, config.minOpportunityEdgePct)
        : 1;

      if (edge < minEdge) continue;

      const riskTier = assessRisk(spread, mkt.liquidity, mkt.volume24hr);
      const cat = categorize(mkt.question, mkt.category);

      // Confidence based on volume + liquidity + edge
      const volScore = Math.min(mkt.volume24hr / 100000, 1) * 30;
      const liqScore = Math.min(mkt.liquidity / 200000, 1) * 30;
      const edgeScore = Math.min(edge / 10, 1) * 40;
      const confidence = Math.round(volScore + liqScore + edgeScore);

      opps.push({
        id: mkt.id,
        question: mkt.question,
        category: cat,
        yesPrice,
        noPrice,
        spread,
        edge: Math.round(edge * 10) / 10,
        volume24h: mkt.volume24hr,
        liquidity: mkt.liquidity,
        riskTier,
        confidence,
        expiresAt: mkt.endDate,
      });
    } catch {
      continue;
    }
  }

  // Sort by edge descending, then confidence
  const maxCandidates = Number.isFinite(config.maxCandidates)
    ? Math.min(Math.max(Math.floor(config.maxCandidates), 1), 5000)
    : 200;

  return opps
    .sort((a, b) => b.edge - a.edge || b.confidence - a.confidence)
    .slice(0, maxCandidates);
}

/* ================================================================
   TRADE DECISION ENGINE
   ================================================================ */

/**
 * Given scored opportunities and config, decide which trades to make.
 * Returns trade recommendations (not executed yet).
 */
export function decideTrades(
  opportunities: MarketOpportunity[],
  config: BotConfig,
  dailyPnl: number,
): { opp: MarketOpportunity; side: "YES" | "NO"; shares: number; reason: string }[] {
  const trades: { opp: MarketOpportunity; side: "YES" | "NO"; shares: number; reason: string }[] = [];

  // Check daily loss limit
  if (dailyPnl <= -config.maxDailyLoss) {
    return []; // Stop trading — daily loss limit hit
  }

  // Check emergency stop
  const remainingBudget = config.maxDailyLoss + dailyPnl;
  if (remainingBudget <= 0) return [];

  for (const opp of opportunities) {
    // Only trade within allowed risk level based on portfolio mix
    const mixPct = config.portfolioMix[opp.riskTier] ?? 0;
    if (mixPct === 0) continue;

    // Minimum confidence threshold per risk level
    const minConfidence: Record<RiskLevel, number> = {
      low: 60,
      medium: 45,
      high: 30,
    };

    if (opp.confidence < minConfidence[config.riskLevel]) continue;

    // Focus area filter
    if (!config.focusAreas.includes("all") && !config.focusAreas.includes(opp.category)) {
      continue;
    }

    // Determine side — buy the cheaper side if spread exists
    const side: "YES" | "NO" = opp.yesPrice < opp.noPrice ? "YES" : "NO";
    const price = side === "YES" ? opp.yesPrice : opp.noPrice;

    // Position sizing based on portfolio mix and remaining budget
    const budgetForTier = (remainingBudget * mixPct) / 100;
    const configuredMaxPositionUsd = Number.isFinite(config.maxPositionUsd)
      ? Math.max(config.maxPositionUsd, 1)
      : 50;
    const maxPositionSize = Math.min(budgetForTier * 0.3, configuredMaxPositionUsd);
    const shares = Math.max(1, Math.floor(maxPositionSize / price));

    if (shares * price < 1) continue; // Too small

    trades.push({
      opp,
      side,
      shares,
      reason: `${opp.edge}% edge, ${opp.confidence}% confidence, ${opp.riskTier} risk`,
    });

    const maxTradesPerScan = Number.isFinite(config.maxTradesPerScan)
      ? Math.max(1, Math.floor(config.maxTradesPerScan))
      : 3;
    if (trades.length >= maxTradesPerScan) break;
  }

  return trades;
}

/* ================================================================
   PAPER TRADE SIMULATOR
   ================================================================ */

/**
 * Simulate a paper trade — returns a TradeRecord without executing on-chain.
 */
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
