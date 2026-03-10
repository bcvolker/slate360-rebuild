import type { MarketListing, MarketTrade } from "@/components/dashboard/market/types";

export function formatCents(price: number): string {
  return `${Math.round(price * 100)}c`;
}

export function outcomePlainLabel(outcome: "YES" | "NO"): string {
  return outcome === "YES" ? "This happens" : "This does not happen";
}

export function outcomeExplanation(outcome: "YES" | "NO"): string {
  return outcome === "YES"
    ? "You profit if the event resolves YES."
    : "You profit if the event resolves NO.";
}

export function marketChanceLabel(probabilityPct: number): string {
  if (probabilityPct >= 70) return "Market strongly expects this outcome";
  if (probabilityPct >= 55) return "Market slightly leans this way";
  if (probabilityPct >= 45) return "Market sees this as close to even";
  if (probabilityPct >= 30) return "Market is skeptical this happens";
  return "Market sees this as unlikely";
}

export function marketResolutionLabel(market: Pick<MarketListing, "endDateLabel" | "endDateIso" | "endDate">): string {
  return market.endDateLabel ?? (market.endDateIso || market.endDate ? new Date(market.endDateIso ?? market.endDate ?? "").toLocaleString() : "Resolution date not available");
}

export function tradeModeLabel(trade: Pick<MarketTrade, "paperTrade">): string {
  return trade.paperTrade ? "Practice trade" : "Live trade";
}