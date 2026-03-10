import type { MktTimeframe } from "@/components/dashboard/market/types";

export function getDirectBuyFetchPlan(timeframe: MktTimeframe, query = "") {
  const normalizedQuery = query.trim();
  const isSoonEnding = timeframe === "hour" || timeframe === "day" || timeframe === "week";

  if (normalizedQuery.length > 0) {
    return {
      key: `search:${timeframe}:${normalizedQuery.toLowerCase()}`,
      mode: "search",
      order: isSoonEnding ? "endDate" : "volume24hr",
      ascending: isSoonEnding,
      maxMarkets: isSoonEnding ? 2400 : 1200,
      upcoming: isSoonEnding,
      label: isSoonEnding
        ? `Searching for \"${normalizedQuery}\" in soon-closing markets`
        : `Searching a broader market set for \"${normalizedQuery}\"`,
    } as const;
  }

  if (isSoonEnding) {
    return {
      key: `ending-soon:${timeframe}`,
      mode: "ending-soon",
      order: "endDate",
      ascending: true,
      maxMarkets: 400,
      upcoming: true,
      label: "Showing soonest-closing markets first",
    } as const;
  }

  return {
    key: `broad:${timeframe}`,
    mode: "broad",
    order: "volume24hr",
    ascending: false,
    maxMarkets: 400,
    upcoming: false,
    label: "Showing top liquid markets first",
  } as const;
}