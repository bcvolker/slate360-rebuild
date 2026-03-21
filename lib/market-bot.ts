export type RiskLevel = "low" | "medium" | "high";

export type FocusArea = "all" | "crypto" | "politics" | "sports" | "weather" | "economy" | "construction" | "real-estate" | "entertainment";

export interface PortfolioMix {
  low: number;
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
  edge: number;
  volume24h: number;
  liquidity: number;
  riskTier: RiskLevel;
  confidence: number;
  expiresAt: string;
  /** true when YES + NO prices sum to less than $1 (guaranteed profit window) */
  isArbitrage: boolean;
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
  riskLevel: "medium",
  paperMode: true,
  maxDailyLoss: 100,
  emergencyStopPct: 15,
  maxTradesPerScan: 50,
  maxPositionUsd: 250,
  minOpportunityEdgePct: 0,
  maxCandidates: 500,
  walletAddress: null,
  botStatus: "stopped",
  portfolioMix: { low: 40, medium: 40, high: 20 },
  focusAreas: ["all"],
  whaleWatch: false,
};

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

export async function fetchMarkets(
  focusAreas: FocusArea[],
  limit = 200,
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

    if (!focusAreas.includes("all") && focusAreas.length > 0) {
      const categoryMap: Record<string, string[]> = {
        crypto: ["crypto", "bitcoin", "ethereum", "btc", "eth", "defi"],
        politics: ["politics", "election", "president", "congress", "vote"],
        sports: ["sports", "nfl", "nba", "mlb", "soccer", "football"],
        weather: ["weather", "hurricane", "temperature", "climate", "snow", "rainfall", "storm"],
        economy: ["economy", "gdp", "fed", "interest", "inflation", "rates", "jobs", "recession"],
        construction: ["construction", "housing starts", "building permits", "real estate development", "infrastructure"],
        "real-estate": ["real estate", "housing", "mortgage", "home price", "rent", "commercial property"],
        entertainment: ["entertainment", "movie", "film", "box office", "music", "oscars", "celebrity", "tv"],
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

function categorize(question: string, category?: string): FocusArea {
  const q = (question + " " + (category ?? "")).toLowerCase();
  if (/crypto|bitcoin|btc|eth|defi|token/.test(q)) return "crypto";
  if (/president|congress|election|poll|vote|politic/.test(q)) return "politics";
  if (/nfl|nba|mlb|soccer|football|sport|game|match/.test(q)) return "sports";
  if (/weather|hurricane|temperature|storm|climate/.test(q)) return "weather";
  if (/construction|building permit|housing starts|infrastructure/.test(q)) return "construction";
  if (/real estate|housing|mortgage|home price|rent|commercial property/.test(q)) return "real-estate";
  if (/entertainment|movie|film|box office|music|oscars|celebrity|tv/.test(q)) return "entertainment";
  if (/economy|gdp|fed|inflation|construction|interest/.test(q)) return "economy";
  return "all";
}

function assessRisk(spread: number, liquidity: number, volume: number): RiskLevel {
  if (spread < 0.05 && liquidity > 50000) return "low";
  if (spread > 0.15 || liquidity < 5000) return "high";
  return "medium";
}

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

      // Arbitrage: YES + NO cost less than $1 → buying both sides locks in profit
      const isArbitrage = (yesPrice + noPrice) < 1 && yesPrice > 0 && noPrice > 0;

      const minEdge = Number.isFinite(config.minOpportunityEdgePct)
        ? Math.max(0, config.minOpportunityEdgePct)
        : 1;

      // Always allow arbitrage opportunities through, even if below min edge
      if (edge < minEdge && !isArbitrage) continue;

      const riskTier = assessRisk(spread, mkt.liquidity, mkt.volume24hr);
      const cat = categorize(mkt.question, mkt.category);

      // Time-decay bonus: markets expiring sooner get a boost (more actionable)
      const msUntilExpiry = new Date(mkt.endDate).getTime() - Date.now();
      const daysUntilExpiry = Math.max(0, msUntilExpiry / 86_400_000);
      const timeDecayBonus = daysUntilExpiry < 7 ? 10 : daysUntilExpiry < 30 ? 5 : 0;

      // Probability-edge: markets near 50/50 have more upside than 95/5
      const probMidDistance = Math.abs(yesPrice - 0.5);
      const probEdgeBonus = probMidDistance < 0.15 ? 8 : probMidDistance < 0.3 ? 4 : 0;

      const volScore = Math.min(mkt.volume24hr / 50000, 1) * 25;
      const liqScore = Math.min(mkt.liquidity / 100000, 1) * 20;
      const edgeScore = Math.min(edge / 8, 1) * 30;
      // Arbitrage gets a flat +20 confidence bonus — it's the safest trade type
      const arbBonus = isArbitrage ? 20 : 0;
      const confidence = Math.round(volScore + liqScore + edgeScore + timeDecayBonus + probEdgeBonus + arbBonus);

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
        isArbitrage,
      });
    } catch {
      continue;
    }
  }

  const maxCandidates = Number.isFinite(config.maxCandidates)
    ? Math.min(Math.max(Math.floor(config.maxCandidates), 1), 5000)
    : 200;

  // Arbitrage opportunities sort first (guaranteed profit), then by edge + confidence
  return opps
    .sort((a, b) => {
      if (a.isArbitrage !== b.isArbitrage) return a.isArbitrage ? -1 : 1;
      return b.edge - a.edge || b.confidence - a.confidence;
    })
    .slice(0, maxCandidates);
}

// Trade decision logic extracted to lib/market/trade-decisions.ts for file size compliance
export { decideTrades, simulatePaperTrade } from "@/lib/market/trade-decisions";
