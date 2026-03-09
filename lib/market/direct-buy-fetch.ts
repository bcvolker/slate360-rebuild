import type { MktTimeframe } from "@/components/dashboard/market/types";

export function getDirectBuyFetchPlan(timeframe: MktTimeframe) {
  if (timeframe === "hour" || timeframe === "day" || timeframe === "week") {
    return {
      mode: "ending-soon",
      order: "endDate",
      ascending: true,
      maxMarkets: 1200,
      label: "Showing soonest-closing markets first",
    } as const;
  }

  return {
    mode: "broad",
    order: "volume24hr",
    ascending: false,
    maxMarkets: 1200,
    label: "Showing top liquid markets first",
  } as const;
}