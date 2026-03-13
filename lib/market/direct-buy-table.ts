import type { MarketListing, MarketSortDirection, MarketSortKey, MktRiskTag, MktTimeframe } from "@/components/dashboard/market/types";
import { getMarketOpportunitySignal, getMarketSpreadPct } from "@/lib/market/opportunity";
import { queryMatchesText } from "@/lib/market/search-synonyms";

export function endCutoff(tf: MktTimeframe): number {
  const now = Date.now();
  const day = 86_400_000;
  const todayEnd = new Date(new Date().toDateString()).getTime() + day;
  switch (tf) {
    case "hour": return now + 3_600_000;
    case "day": return now + day;
    case "week": return now + 7 * day;
    case "month": return now + 30 * day;
    case "year": return now + 365 * day;
    case "today": return todayEnd;
    case "tomorrow": return todayEnd + day;
    default: return Infinity;
  }
}

export function filterAndSortMarkets({
  markets,
  query,
  timeframe,
  category,
  probMin,
  probMax,
  minEdge,
  riskTag,
  sortBy,
  sortDirection,
  minVolume,
  minLiquidity,
  maxSpread,
}: {
  markets: MarketListing[];
  query: string;
  timeframe: MktTimeframe;
  category: string;
  probMin: number;
  probMax: number;
  minEdge: number;
  riskTag: MktRiskTag;
  sortBy: MarketSortKey;
  sortDirection: MarketSortDirection;
  minVolume: number;
  minLiquidity: number;
  maxSpread: number;
}): MarketListing[] {
  const now = Date.now();
  const cut = endCutoff(timeframe);
  const normalizedQuery = query.trim().toLowerCase();

  return markets
    .filter((market) => {
      if (normalizedQuery) {
        const haystack = `${market.title} ${market.category}`;
        if (!queryMatchesText(normalizedQuery, haystack)) return false;
      }
      if (timeframe !== "all") {
        const iso = market.endDate ?? market.endDateIso;
        if (!iso) return false;
        const endTime = new Date(iso).getTime();
        if (!Number.isFinite(endTime)) return false;
        if (endTime < now) return false;
        if (endTime > cut) return false;
      }
      if (category !== "all" && market.category !== category) return false;
      if (market.probabilityPct < probMin || market.probabilityPct > probMax) return false;
      if (market.edgePct < minEdge) return false;
      if (riskTag !== "all") {
        if (riskTag === "none" && market.riskTag) return false;
        if (riskTag !== "none" && market.riskTag !== riskTag) return false;
      }
      if (market.volume24hUsd < minVolume) return false;
      if (market.liquidityUsd < minLiquidity) return false;
      if (getMarketSpreadPct(market) > maxSpread) return false;
      return true;
    })
    .sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      switch (sortBy) {
        case "edge": return (left.edgePct - right.edgePct) * direction;
        case "probability": return (left.probabilityPct - right.probabilityPct) * direction;
        case "title": return left.title.localeCompare(right.title) * direction;
        case "yesPrice": return (left.yesPrice - right.yesPrice) * direction;
        case "noPrice": return (left.noPrice - right.noPrice) * direction;
        case "signal": return (getMarketOpportunitySignal(left).rank - getMarketOpportunitySignal(right).rank) * direction;
        case "endDate": {
          const leftEnd = left.endDate ? new Date(left.endDate).getTime() : Infinity;
          const rightEnd = right.endDate ? new Date(right.endDate).getTime() : Infinity;
          return (leftEnd - rightEnd) * direction;
        }
        default: return (left.volume24hUsd - right.volume24hUsd) * direction;
      }
    });
}

export function buildTableInsights(markets: MarketListing[]) {
  const signalCounts = markets.reduce(
    (counts, market) => {
      const signal = getMarketOpportunitySignal(market).label.toLowerCase() as "premium" | "strong" | "watch" | "thin" | "speculative";
      counts[signal] += 1;
      return counts;
    },
    { premium: 0, strong: 0, watch: 0, thin: 0, speculative: 0 },
  );

  const topEdge = markets.reduce((best, market) => market.edgePct > best ? market.edgePct : best, 0);
  const averageVolume = markets.length > 0
    ? markets.reduce((sum, market) => sum + market.volume24hUsd, 0) / markets.length
    : 0;
  const tightMarkets = markets.filter((market) => getMarketSpreadPct(market) <= 5).length;

  return {
    signalCounts,
    topEdge,
    averageVolume,
    tightMarkets,
  };
}