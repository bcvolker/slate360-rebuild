import { fetchMarkets, type FocusArea, type RiskLevel } from "@/lib/market-bot";

export type SchedulerConfig = {
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  maxUsersPerTick: number;
  concurrency: number;
  maxTradesPerScan: number;
  maxMarketLimit: number;
  defaultBuysPerDay: number;
  defaultCapitalUsd: number;
  maxPositionUsdCap: number;
};

export type MarketsPromiseCache = Map<string, Promise<Awaited<ReturnType<typeof fetchMarkets>>>>;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getConfig(): SchedulerConfig {
  const minIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MIN_INTERVAL_SECONDS ?? 30);
  const maxIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MAX_INTERVAL_SECONDS ?? 3600);
  const maxUsersPerTick = Number(process.env.MARKET_SCHEDULER_MAX_USERS_PER_TICK ?? 100);
  const concurrency = Number(process.env.MARKET_SCHEDULER_CONCURRENCY ?? 12);
  const maxTradesPerScan = Number(process.env.MARKET_SCHEDULER_MAX_TRADES_PER_SCAN ?? 250);
  const maxMarketLimit = Number(process.env.MARKET_SCHEDULER_MAX_MARKET_LIMIT ?? 5000);
  const defaultBuysPerDay = Number(process.env.MARKET_SCHEDULER_DEFAULT_BUYS_PER_DAY ?? 24);
  const defaultCapitalUsd = Number(process.env.MARKET_SCHEDULER_DEFAULT_CAPITAL_USD ?? 1000);
  const maxPositionUsdCap = Number(process.env.MARKET_SCHEDULER_MAX_POSITION_USD ?? 100000);

  return {
    minIntervalSeconds: clamp(Number.isFinite(minIntervalSeconds) ? minIntervalSeconds : 30, 5, 86400),
    maxIntervalSeconds: clamp(Number.isFinite(maxIntervalSeconds) ? maxIntervalSeconds : 3600, 30, 86400),
    maxUsersPerTick: clamp(Number.isFinite(maxUsersPerTick) ? Math.floor(maxUsersPerTick) : 100, 1, 1000),
    concurrency: clamp(Number.isFinite(concurrency) ? Math.floor(concurrency) : 12, 1, 100),
    maxTradesPerScan: clamp(Number.isFinite(maxTradesPerScan) ? Math.floor(maxTradesPerScan) : 250, 1, 5000),
    maxMarketLimit: clamp(Number.isFinite(maxMarketLimit) ? Math.floor(maxMarketLimit) : 5000, 50, 10000),
    defaultBuysPerDay: clamp(Number.isFinite(defaultBuysPerDay) ? Math.floor(defaultBuysPerDay) : 24, 1, 100000),
    defaultCapitalUsd: Number.isFinite(defaultCapitalUsd) ? Math.max(defaultCapitalUsd, 1) : 1000,
    maxPositionUsdCap: Number.isFinite(maxPositionUsdCap) ? Math.max(maxPositionUsdCap, 1) : 100000,
  };
}

export async function fetchMarketsCached(
  focusAreas: FocusArea[],
  limit: number,
  cache: MarketsPromiseCache,
): Promise<Awaited<ReturnType<typeof fetchMarkets>>> {
  const key = `${focusAreas.join(",")}|${limit}`;
  const cachedPromise = cache.get(key);
  if (cachedPromise) return cachedPromise;
  const promise = fetchMarkets(focusAreas, limit);
  cache.set(key, promise);
  return promise;
}

export function normalizeFocusAreas(values: string[] | null | undefined): FocusArea[] {
  const allowed: FocusArea[] = [
    "all",
    "crypto",
    "politics",
    "sports",
    "weather",
    "economy",
    "construction",
    "real-estate",
    "entertainment",
  ];

  const normalized = (values ?? [])
    .map((value) => {
      const lower = String(value).toLowerCase();
      if (lower.includes("real estate")) return "real-estate";
      return lower;
    })
    .filter((value): value is FocusArea => allowed.includes(value as FocusArea));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["all"];
}

export function riskLevelFromMix(mix: "conservative" | "balanced" | "aggressive" | null): RiskLevel {
  if (mix === "conservative") return "low";
  if (mix === "aggressive") return "high";
  return "medium";
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
