import type { MktTimeframe } from "@/components/dashboard/market/types";

export function getDirectBuyFetchPlan(timeframe: MktTimeframe, query = "") {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length > 0) {
    return {
      key: `search:${timeframe}`,
      mode: "search",
      order: "volume24hr",
      ascending: false,
      maxMarkets: 4000,
      label: `Searching a broader market set for \"${normalizedQuery}\"`,
    } as const;
  }

  if (timeframe === "hour" || timeframe === "day" || timeframe === "week") {
    return {
      key: `ending-soon:${timeframe}`,
      mode: "ending-soon",
      order: "endDate",
      ascending: true,
      maxMarkets: 1200,
      label: "Showing soonest-closing markets first",
    } as const;
  }

  return {
    key: `broad:${timeframe}`,
    mode: "broad",
    order: "volume24hr",
    ascending: false,
    maxMarkets: 1200,
    label: "Showing top liquid markets first",
  } as const;
}