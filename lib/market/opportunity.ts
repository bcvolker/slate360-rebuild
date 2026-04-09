import type { MarketListing } from "@/components/dashboard/market/types";

export type MarketOpportunitySignal = {
  label: "Premium" | "Strong" | "Watch" | "Thin" | "Speculative";
  tone: string;
  detail: string;
  rank: number;
};

export function getMarketSpreadPct(market: MarketListing): number {
  return Math.max(0, (1 - market.yesPrice - market.noPrice) * 100);
}

export function getMarketOpportunitySignal(market: MarketListing): MarketOpportunitySignal {
  const spreadPct = getMarketSpreadPct(market);

  if (market.edgePct >= 12 && market.volume24hUsd >= 100000 && market.liquidityUsd >= 75000 && spreadPct <= 4) {
    return {
      label: "Premium",
      tone: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      detail: "High edge with deep volume and tight pricing.",
      rank: 5,
    };
  }
  if (market.edgePct >= 8 && market.volume24hUsd >= 40000 && spreadPct <= 8) {
    return {
      label: "Strong",
      tone: "bg-amber-100 text-orange-700 border border-orange-200",
      detail: "Solid pricing advantage with healthy activity.",
      rank: 4,
    };
  }
  if (market.edgePct >= 4 && market.volume24hUsd >= 15000) {
    return {
      label: "Watch",
      tone: "bg-amber-100 text-amber-700 border border-amber-200",
      detail: "Potential edge, but execution quality should be checked.",
      rank: 3,
    };
  }
  if (spreadPct > 12 || market.liquidityUsd < 5000) {
    return {
      label: "Thin",
      tone: "bg-slate-100 text-slate-600 border border-slate-200",
      detail: "Lower liquidity or wider spread can worsen fills.",
      rank: 2,
    };
  }
  return {
    label: "Speculative",
    tone: "bg-rose-100 text-rose-700 border border-rose-200",
    detail: "More dependent on conviction than pricing quality.",
    rank: 1,
  };
}